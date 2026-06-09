import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { applyEdits, modify, type ParseError, parse as parseJsonc } from "jsonc-parser";
import { builtinBlocks, composeJsoncWithHints, createRegistry } from "pressedslip/browser";
import { type JSX, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  type ImperativePanelHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { Builder } from "./components/Builder.js";
import { JsonEditor } from "./components/JsonEditor.js";
import { Palette } from "./components/Palette.js";
import { Preview } from "./components/Preview.js";
import { Toolbar } from "./components/Toolbar.js";
import { initialComposition, initialCompositionJsonc } from "./initial-composition.js";
import { renderDraft, type ThemeId } from "./render-with-wasm.js";
import { showcaseBlocks } from "./showcase-blocks/index.js";
import {
  type DraftComposition,
  type DraftSlot,
  draftReducer,
  initialEditorDraft,
} from "./state/draft-composition.js";
import type { Variant } from "./variants/index.js";

/**
 * What's currently being dragged. Used to render a DragOverlay ghost so the
 * user sees something following the cursor during a drag. Without this,
 * @dnd-kit applies only `transform` to in-place items — which feels broken
 * for palette-source drags where the source stays in place.
 */
type ActiveDrag =
  | { kind: "palette"; variant: Variant }
  | { kind: "slot"; index: number; slot: DraftSlot };

/**
 * Produce a stably-sorted JSON serialization of any value, with object keys
 * sorted alphabetically at every depth. Used for semantic comparison in the
 * draft → text sync effect: Zod's safeParse reorders keys to its schema's
 * shape order, while parseJsonc preserves source order. Naive JSON.stringify
 * would flag these as "different" even when the underlying data is identical.
 */
function canonicalSorted(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort()) sorted[k] = (v as Record<string, unknown>)[k];
      return sorted;
    }
    return v;
  });
}

export function App(): JSX.Element {
  // EditorState wraps DraftComposition + parallel slotUids (see spec §3.4).
  const [editor, dispatch] = useReducer(draftReducer, initialComposition, initialEditorDraft);
  const [draftText, setDraftText] = useState(() => initialCompositionJsonc);
  const [themeId, setThemeId] = useState<ThemeId>(() =>
    typeof localStorage !== "undefined"
      ? ((localStorage.getItem("themeId") as ThemeId) ?? "default")
      : "default",
  );
  const [isFontsLoading, setIsFontsLoading] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

  // Registry for composeJsoncWithHints — stable across renders (builtinBlocks is a constant).
  // Spread showcaseBlocks so the demo block types are dispatchable in
  // the renderer and the palette shows the showcase blocks alongside the builtin
  // catalog; showcaseBlocks is playground-only.
  const registry = useMemo(() => createRegistry([...builtinBlocks, ...showcaseBlocks]), []);

  // Width is playground-only state — NOT a field on DraftComposition.
  // 576 = PAPER.thermal80 (80mm thermal printer @ 203dpi).
  const [width, setWidth] = useState<number>(576);
  const [highlightUid, setHighlightUid] = useState<string | null>(null);
  // Set to true by the double-click add-variant path; consumed by the
  // useEffect below that grabs the UID of the just-appended slot and
  // schedules a 600ms transient highlight (scroll-into-view + flash ring).
  const pendingHighlightRef = useRef(false);
  const [isStale, setIsStale] = useState<boolean>(false);
  const renderDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewPanelRef = useRef<ImperativePanelHandle>(null);

  // Resize the preview Panel so its inner width equals `width` (the canonical
  // PNG width). The preview-scroll has 16 px horizontal padding on each side,
  // hence the +32 px. Reads .app's clientWidth at click time so it accounts
  // for the current viewport rather than baking in a stale value.
  const onResetZoom = useCallback(() => {
    const panel = previewPanelRef.current;
    if (panel === null) return;
    const appEl = document.querySelector(".app");
    if (appEl === null) return;
    const totalWidth = appEl.clientWidth;
    if (totalWidth <= 0) return;
    const targetPx = width + 32;
    const targetPercent = (targetPx / totalWidth) * 100;
    panel.resize(targetPercent);
  }, [width]);

  // Push draft → JSON text whenever the draft changes (cursor preserved by CodeMirror controlled-value).
  // slotUids is editor-internal and never serialized.
  //
  // Comment-preserving gate: only act when editor.draft itself
  // changed referentially. When ONLY draftText changes (user typing in the
  // JSON pane), the original gate erroneously compared the in-flight text
  // against the stale editor.draft and reverted user typing as a "sync"
  // operation. Track the last editor.draft we processed via useRef; bail
  // out early if it hasn't changed. If it has changed AND the current
  // draftText already canonicalizes to it (came from REPLACE_FROM_JSON via
  // the same text), skip the overwrite to preserve user-authored comments.
  // Only otherwise (true builder mutation: drag/delete/duplicate) does the
  // canonical serialization replace draftText, intentionally wiping the
  // user's stale JSONC comments.
  const lastDraftRef = useRef(editor.draft);
  useEffect(() => {
    if (lastDraftRef.current === editor.draft) return;
    lastDraftRef.current = editor.draft;
    // Key-order-independent comparison: Zod's z.object.safeParse REORDERS keys
    // to the schema's shape-definition order (slots, date, subject, meta in
    // our case), but parseJsonc preserves the source's key order (date,
    // subject, meta, slots in the JSONC seed). JSON.stringify is order-
    // sensitive, so naive comparison would incorrectly flag "different" when
    // the data is semantically identical. canonicalSorted() emits a
    // stably-sorted representation of any object/array tree.
    const parseErrors: ParseError[] = [];
    const parsed = parseJsonc(draftText, parseErrors, { allowTrailingComma: true });
    if (
      parseErrors.length === 0 &&
      parsed !== undefined &&
      canonicalSorted(parsed) === canonicalSorted(editor.draft)
    ) {
      return;
    }
    const canonical = composeJsoncWithHints(editor.draft, registry);
    if (canonical !== draftText) setDraftText(canonical);
  }, [editor.draft, draftText, registry]);

  // Persist theme
  useEffect(() => {
    if (typeof localStorage !== "undefined") localStorage.setItem("themeId", themeId);
  }, [themeId]);

  // Cleanup debounce timer on unmount.
  useEffect(
    () => () => {
      if (renderDebounceTimer.current !== null) clearTimeout(renderDebounceTimer.current);
    },
    [],
  );

  const triggerRender = useCallback(
    (opts: { clearStale: boolean }) => {
      setIsRendering(true);
      setError(null);
      renderDraft(editor.draft, themeId, { width })
        .then((result) => {
          setPreviewSrc(result.src);
          if (opts.clearStale) setIsStale(false);
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
        .finally(() => {
          setIsRendering(false);
          // Clear isFontsLoading unconditionally — font loading is now part of
          // the render() call (package lazy-loads fonts from ThemeTemplate).
          // After the first render for a theme, subsequent renders are fast
          // (package-internal cache). Clearing here keeps the Render button
          // enabled for retries even if an error occurred.
          setIsFontsLoading(false);
        });
    },
    [editor.draft, themeId, width],
  );

  const triggerRenderDebounced = useCallback(() => {
    // Trailing-edge 150ms debounce — coalesces rapid preset toggles into a single
    // render. Leading-edge would fire immediately and drop subsequent
    // clicks; wrong for "coalesce".
    if (renderDebounceTimer.current !== null) clearTimeout(renderDebounceTimer.current);
    renderDebounceTimer.current = setTimeout(() => {
      triggerRender({ clearStale: false });
    }, 150);
  }, [triggerRender]);

  const onRender = useCallback(() => triggerRender({ clearStale: true }), [triggerRender]);

  const onThemeChange = useCallback(
    (id: ThemeId) => {
      setThemeId(id);
      dispatch({ type: "SET_THEME", themeId: id });
      // Surgically update the meta.playgroundThemeId in the JSON pane text via
      // jsonc-parser.modify — preserves comments + formatting around the field.
      // Without this, the SET_THEME action mutates editor.draft, the ref-gate
      // effect detects the change, and falls back to the canonical overwrite
      // (which wipes user's JSONC comments). With this, draftText and
      // editor.draft stay semantically equal so the gate's canonicalSorted
      // comparison skips the overwrite.
      const edits = modify(draftText, ["meta", "playgroundThemeId"], id, {
        formattingOptions: { insertSpaces: true, tabSize: 2 },
      });
      if (edits.length > 0) setDraftText(applyEdits(draftText, edits));
      // Font loading is now delegated to the package's render() via the ThemeTemplate.
      // We still set isFontsLoading=true so the Render button stays disabled until the
      // first render (which fetches fonts) completes. The flag is cleared in triggerRender's
      // finally block via setIsRendering(false); for the theme-change path we need our own
      // handoff: set loading, schedule debounced render, clear loading when render settles.
      setIsFontsLoading(true);
      // Theme change is a user interaction → always auto-render (even on
      // first interaction, which transparently bootstraps wasm same as
      // the CTA does). An earlier `previewSrc !== null` gate was over-eager
      // — the requirement is no auto-render between mount and first user
      // interaction; selecting a dropdown IS user interaction.
      triggerRenderDebounced();
    },
    [draftText, triggerRenderDebounced],
  );

  const onWidthChange = useCallback(
    (next: number) => {
      setWidth(next);
      // See onThemeChange — dropdown change is user interaction; auto-render
      // always. First width change bootstraps wasm if not already booted.
      triggerRenderDebounced();
    },
    [triggerRenderDebounced],
  );

  const sensors = useSensors(
    // 5px activation distance so a click on a slot-card button (×, ⎘) fires
    // as a click rather than starting an immediate drag. Standard @dnd-kit
    // pattern for cards with interactive children.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // DnD identifier convention:
  //   palette items: `palette:<variant.id>` (active only; never a drop target)
  //   builder slots: the slot's UID (editor.slotUids[i]) — passed to SortableContext as `items`
  const onDragStart = useCallback(
    (e: DragStartEvent) => {
      const data = e.active.data.current as { source?: string; variant?: Variant } | undefined;
      if (data?.source === "palette" && data.variant !== undefined) {
        setActiveDrag({ kind: "palette", variant: data.variant });
        return;
      }
      if (typeof e.active.id === "string") {
        const index = editor.slotUids.indexOf(e.active.id);
        const slot = editor.draft.slots[index];
        if (slot !== undefined) setActiveDrag({ kind: "slot", index, slot });
      }
    },
    [editor.slotUids, editor.draft.slots],
  );

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveDrag(null);
      const over = e.over;
      if (over === null) return;
      const activeData = e.active.data.current as
        | { source?: string; variant?: Variant }
        | undefined;

      // Palette → Builder (insert at end, or at the over-slot position).
      if (activeData?.source === "palette" && activeData.variant !== undefined) {
        const overUid = typeof over.id === "string" ? over.id : null;
        const atIndex =
          overUid !== null ? editor.slotUids.indexOf(overUid) : editor.slotUids.length;
        dispatch({
          type: "INSERT",
          slot: activeData.variant.slot,
          atIndex: atIndex < 0 ? undefined : atIndex,
        });
        setIsStale(true);
        return;
      }

      // Builder → Builder reorder. Both ids are UIDs; map to indices via slotUids.
      if (
        typeof e.active.id === "string" &&
        typeof over.id === "string" &&
        e.active.id !== over.id
      ) {
        const fromIndex = editor.slotUids.indexOf(e.active.id);
        const toIndex = editor.slotUids.indexOf(over.id);
        if (fromIndex !== -1 && toIndex !== -1) {
          dispatch({ type: "REORDER", fromIndex, toIndex });
          setIsStale(true);
        }
      }
    },
    [editor.slotUids],
  );

  const onDragCancel = useCallback(() => setActiveDrag(null), []);

  // Single-click on a palette card appends the variant's slot to the end.
  // Mirror the drag-and-drop INSERT branch so JSONC ref-gate + stale-banner
  // bookkeeping stay consistent across both add-paths.
  const onAddVariant = useCallback((variant: Variant) => {
    pendingHighlightRef.current = true;
    dispatch({ type: "INSERT", slot: variant.slot });
    setIsStale(true);
  }, []);

  // After dispatch flushes, the reducer has appended a new uid to
  // editor.slotUids. Grab it, highlight for 600ms, clear. The pending ref
  // gates this so unrelated slotUids changes (drag-and-drop INSERT, DELETE,
  // REORDER, DUPLICATE, REPLACE_FROM_JSON) don't trigger a spurious flash.
  useEffect(() => {
    if (!pendingHighlightRef.current) return;
    pendingHighlightRef.current = false;
    const newUid = editor.slotUids[editor.slotUids.length - 1];
    if (newUid === undefined) return;
    setHighlightUid(newUid);
    const timer = setTimeout(() => setHighlightUid(null), 600);
    return () => clearTimeout(timer);
  }, [editor.slotUids]);

  return (
    <div className="app">
      <Toolbar
        themeId={themeId}
        onThemeChange={onThemeChange}
        isFontsLoading={isFontsLoading}
        width={width}
        onWidthChange={onWidthChange}
      />
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <PanelGroup direction="horizontal">
          <Panel defaultSize={18} minSize={12}>
            <Palette onAddVariant={onAddVariant} />
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel defaultSize={35} minSize={20}>
            <div className="center-column">
              <PanelGroup direction="vertical" className="center-panels">
                <Panel defaultSize={45} minSize={20}>
                  <Builder
                    slots={editor.draft.slots}
                    slotUids={editor.slotUids}
                    onDelete={(index: number) => {
                      dispatch({ type: "DELETE", index });
                      setIsStale(true);
                    }}
                    onDuplicate={(index: number) => {
                      dispatch({ type: "DUPLICATE", index });
                      setIsStale(true);
                    }}
                    highlightUid={highlightUid}
                  />
                </Panel>
                <PanelResizeHandle className="resize-handle-h" />
                <Panel defaultSize={55} minSize={20}>
                  <JsonEditor
                    text={draftText}
                    onTextChange={(next: string) => {
                      setDraftText(next);
                      setIsStale(true);
                    }}
                    onParsedDraft={(d: DraftComposition) => {
                      // Sync meta.playgroundThemeId back to toolbar state — spec §5.5
                      // "Manually editing it in JSON changes the toolbar selection."
                      const incomingTheme = d.meta?.playgroundThemeId;
                      if (
                        typeof incomingTheme === "string" &&
                        (incomingTheme === "default" ||
                          incomingTheme === "mono" ||
                          incomingTheme === "compact") &&
                        incomingTheme !== themeId
                      ) {
                        setThemeId(incomingTheme);
                        // Font loading is delegated to render() — just set the flag;
                        // triggerRender's finally block clears it after the first render.
                        setIsFontsLoading(true);
                      }
                      dispatch({ type: "REPLACE_FROM_JSON", draft: d });
                      // Defense-in-depth: onTextChange already set isStale=true
                      // for the typing path, but a future caller of onParsedDraft
                      // that bypasses onTextChange would otherwise silently drop
                      // the stale signal. One line, no cost.
                      setIsStale(true);
                    }}
                  />
                </Panel>
              </PanelGroup>
              <div className="render-bar">
                <button type="button" onClick={onRender} disabled={isFontsLoading}>
                  Render
                </button>
                {isRendering ? <span>rendering…</span> : null}
              </div>
            </div>
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel defaultSize={47} minSize={20} ref={previewPanelRef}>
            <Preview
              src={previewSrc}
              canonicalWidth={width}
              isLoading={isRendering || isFontsLoading}
              error={error}
              isStale={isStale}
              onRetry={onRender}
              onGenerate={onRender}
              onResetZoom={onResetZoom}
            />
          </Panel>
        </PanelGroup>
        <DragOverlay dropAnimation={null}>
          {activeDrag === null ? null : activeDrag.kind === "palette" ? (
            <div className="drag-overlay drag-overlay-palette">{activeDrag.variant.label}</div>
          ) : (
            <div className="drag-overlay drag-overlay-slot">
              <span className="slot-handle" aria-hidden>
                ⋮⋮
              </span>
              <span className="slot-title">
                #{activeDrag.index} · {activeDrag.slot.blockType}
                {activeDrag.slot.title !== undefined ? ` · ${activeDrag.slot.title}` : ""}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
