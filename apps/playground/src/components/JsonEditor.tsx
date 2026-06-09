/**
 * @fileoverview JSON editor pane. CodeMirror 6 + lang-json + lint. Two-layer
 * Zod linter per spec §5.5:
 *   1. Outer schema — DraftComposition shape ({slots: [{blockType, data, title?}], meta?})
 *   2. Per-slot data validation — looks up the block's Zod schema in the
 *      registry and validates slot.data against it (surfaces "kpi requires
 *      value: string" etc. at the right gutter position).
 * Both layers map errors to {from, to} via the shared jsonc-parser path resolver
 * so the pane accepts JSONC syntax.
 */

import { json } from "@codemirror/lang-json";
import { type Diagnostic, linter } from "@codemirror/lint";
import CodeMirror from "@uiw/react-codemirror";
import { type ParseError, parse as parseJsonc, printParseErrorCode } from "jsonc-parser";
import {
  createRegistry,
  keyValueBlock,
  kpiBlock,
  listBlock,
  qaPairBlock,
  quotationBlock,
  textCellBlock,
  wordSearchBlock,
} from "pressedslip/browser";
import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import type { DraftComposition } from "../state/draft-composition.js";
import { type JsonPathSegment, resolveJsonPath } from "../util/json-path-resolver.js";

// Outer schema — matches DraftSlot (no `key`, no `index`; `blockType` is the
// camelCase discriminator). `data` is `unknown` here — per-slot validation
// happens in a second pass against the block's own Zod schema.
const slotSchema = z.object({
  blockType: z.string().min(1),
  data: z.unknown(),
  title: z.string().optional(),
});

const subjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

const draftSchema = z.object({
  slots: z.array(slotSchema),
  date: z.string().min(1),
  subject: subjectSchema.optional(),
  meta: z.record(z.string(), z.unknown()),
});

// Registry kept in-module: the linter needs it to look up each block's schema.
// Same seven builtins as render-with-wasm.ts — should ideally be shared via a
// `src/registry.ts` module if duplication becomes painful, but for now the
// two call sites are fine.
const registry = createRegistry([
  keyValueBlock,
  kpiBlock,
  listBlock,
  qaPairBlock,
  quotationBlock,
  textCellBlock,
  wordSearchBlock,
]);

type JsonEditorProps = {
  text: string;
  onTextChange: (next: string) => void;
  onParsedDraft: (draft: DraftComposition) => void;
};

export function JsonEditor({ text, onTextChange, onParsedDraft }: JsonEditorProps): JSX.Element {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lintFn = useMemo(
    () =>
      linter((view) => {
        const src = view.state.doc.toString();
        const parseErrors: ParseError[] = [];
        const parsed: unknown = parseJsonc(src, parseErrors, { allowTrailingComma: true });
        const [firstParseError] = parseErrors;
        if (firstParseError !== undefined) {
          return [
            {
              from: firstParseError.offset,
              to: firstParseError.offset + firstParseError.length,
              severity: "error",
              message: `JSON parse error: ${printParseErrorCode(firstParseError.error)}`,
            },
          ];
        }
        // Layer 1: outer DraftComposition shape.
        const outer = draftSchema.safeParse(parsed);
        if (!outer.success) {
          return outer.error.issues.map((issue): Diagnostic => {
            const range = resolveJsonPath(src, issue.path as JsonPathSegment[]);
            return {
              from: range?.from ?? 0,
              to: range?.to ?? Math.min(1, src.length),
              severity: "error",
              message: `${issue.path.join(".")}: ${issue.message}`,
            };
          });
        }
        // Layer 2: per-slot data validation against each block's own schema.
        const diagnostics: Diagnostic[] = [];
        const draft = outer.data as DraftComposition;
        draft.slots.forEach((slot, i) => {
          const def = registry.find(slot.blockType);
          if (def === undefined) {
            const range = resolveJsonPath(src, ["slots", i, "blockType"]);
            diagnostics.push({
              from: range?.from ?? 0,
              to: range?.to ?? Math.min(1, src.length),
              severity: "error",
              message: `Unknown blockType: "${slot.blockType}" (expected one of: ${registry
                .list()
                .map((d) => d.type)
                .join(", ")})`,
            });
            return;
          }
          const dataResult = def.schema.safeParse(slot.data);
          if (dataResult.success) return;
          for (const issue of dataResult.error.issues) {
            const range = resolveJsonPath(src, [
              "slots",
              i,
              "data",
              ...(issue.path as JsonPathSegment[]),
            ]);
            diagnostics.push({
              from: range?.from ?? 0,
              to: range?.to ?? Math.min(1, src.length),
              severity: "error",
              message: `slots[${i}].data.${issue.path.join(".")}: ${issue.message} (${slot.blockType} schema)`,
            });
          }
        });
        return diagnostics;
      }),
    [],
  );

  const onChange = useCallback(
    (value: string) => {
      onTextChange(value);
      if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const onChangeErrors: ParseError[] = [];
        const parsed = parseJsonc(value, onChangeErrors, { allowTrailingComma: true });
        if (onChangeErrors.length > 0) return; // JSONC parse errors stay in the gutter
        const outer = draftSchema.safeParse(parsed);
        if (!outer.success) return; // outer error → gutter; draft NOT mutated
        const draft = outer.data as DraftComposition;
        // Gate the parse-back on per-slot validation too — only push to the
        // builder when EVERY slot.data passes its block's schema. Otherwise
        // the JSON gutter shows the errors and the builder keeps its prior state.
        for (const slot of draft.slots) {
          const def = registry.find(slot.blockType);
          if (def === undefined) return;
          if (!def.schema.safeParse(slot.data).success) return;
        }
        onParsedDraft(draft);
        // 250ms = perceived-instant ceiling per Nielsen norms; long enough to
        // coalesce normal typing bursts, short enough to feel reactive.
      }, 250);
    },
    [onTextChange, onParsedDraft],
  );

  useEffect(
    () => () => {
      if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
    },
    [],
  );

  return (
    <div className="json-editor">
      <CodeMirror
        value={text}
        onChange={onChange}
        extensions={[json(), lintFn]}
        basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
        height="100%"
      />
    </div>
  );
}
