/**
 * @fileoverview Compose a React tree from a Composition + Registry, validating data and recording failures policy-respectfully.
 */
import type { ReactElement } from "react";
import { toSerializableError } from "../orchestrator/serializable-error.js";
import { BlockShell } from "../shell/BlockShell.js";
import { ShellBottom } from "../shell/ShellBottom.js";
import { ShellTop } from "../shell/ShellTop.js";
import { SHELL_DEFAULTS } from "../themes/apply-defaults.js";
import type { PreparedTheme } from "../themes/types.js";
import type { Block, Composition, FailedBlock, Logger, Registry, RenderContext } from "../types.js";

/**
 * Configuration for a single `composeTree` call. Mirrors the relevant fields
 * of RenderOptions that control failure handling and logging.
 */
export type ComposeTreeOptions = {
  registry: Registry;
  logger: Logger;
  onUnknownType: "skip" | "warn" | "throw";
  onBlockError: "skip" | "placeholder" | "throw";
  /** Fully-resolved theme. When provided, shell and header defaults come from
   * the theme rather than package hardcoded values. Thread via explicit props
   * (NOT React Context — satori does not run hooks, codex F1). */
  prepared?: PreparedTheme;
};

/**
 * The React element tree ready for Satori, plus a list of slots that could not
 * be rendered. `failedBlocks` is always present (empty when all slots succeed).
 */
export type ComposeTreeResult = {
  element: ReactElement;
  failedBlocks: FailedBlock[];
};

/**
 * Walk each slot in `composition`, validate its data against the registered schema,
 * call its render function, and wrap the output in a BlockShell. Unknown types and
 * render errors are handled per `onUnknownType` / `onBlockError` policies and recorded
 * in the returned `failedBlocks` array regardless of the chosen policy.
 */
export function composeTree(composition: Composition, opts: ComposeTreeOptions): ComposeTreeResult {
  const { registry, logger, onUnknownType, onBlockError, prepared } = opts;
  const failedBlocks: FailedBlock[] = [];
  const blockElements: ReactElement[] = [];

  for (const slot of composition.slots) {
    const { index, blockType, data, title } = slot;
    // Derive a stable React key and synthetic Block.id from slot position + type.
    const syntheticId = `${blockType}-${index}`;

    const def = registry.find(blockType);
    if (!def) {
      const message = `Unknown block type: ${blockType}`;
      failedBlocks.push({ index, blockType, reason: { name: "Error", message } });
      if (onUnknownType === "warn") {
        logger.warn("Unknown block type", { blockType, blockId: syntheticId });
      } else if (onUnknownType === "throw") {
        throw new Error(message);
      }
      continue;
    }

    const parsed = def.schema.safeParse(data);
    if (!parsed.success) {
      const message = `Schema validation failed: ${parsed.error.message}`;
      failedBlocks.push({ index, blockType, reason: { name: "Error", message } });
      if (onBlockError === "throw") {
        throw new Error(message);
      }
      logger.error("Block schema validation failed", {
        blockType,
        blockId: syntheticId,
        message: parsed.error.message,
      });
      continue;
    }

    // Construct a synthetic Block for RenderContext backward-compat. Render functions
    // that read ctx.block.type / ctx.block.id / ctx.block.title continue to work.
    const syntheticBlock: Block = {
      type: blockType,
      id: syntheticId,
      title,
      data,
    };

    const ctx: RenderContext = {
      block: syntheticBlock,
      composition,
      subject: composition.subject,
      config: undefined,
      cache: undefined,
      logger,
      theme: prepared?.shell ?? SHELL_DEFAULTS,
      fontRoles: prepared?.fontRoles ?? {},
    };

    try {
      const inner = def.render({ data: parsed.data, ctx });
      if (inner === null) continue;
      blockElements.push(
        <BlockShell
          key={syntheticId}
          title={title}
          options={def.shell}
          theme={prepared?.shell}
          fontRoles={prepared?.fontRoles}
        >
          {inner}
        </BlockShell>,
      );
    } catch (err) {
      const reason =
        err instanceof Error ? toSerializableError(err) : { name: "Error", message: String(err) };
      failedBlocks.push({ index, blockType, reason });
      if (onBlockError === "throw") throw err;
      logger.error("Block render threw", {
        blockType,
        blockId: syntheticId,
        error: reason.message,
      });
    }
  }

  const element = (
    <div
      style={{ width: "100%", display: "flex", flexDirection: "column", backgroundColor: "white" }}
    >
      <ShellTop date={composition.date} subject={composition.subject} theme={prepared?.header} />
      {blockElements}
      <ShellBottom />
    </div>
  );

  return { element, failedBlocks };
}
