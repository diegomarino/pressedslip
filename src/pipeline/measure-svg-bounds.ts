/**
 * @fileoverview Post-Satori SVG bounds walker — detects canvas-edge overflow.
 *
 * Yoga + Satori will silently emit path coordinates beyond the SVG viewBox when
 * a flex child has unbounded intrinsic width (the classic "long text inside a
 * <div> with no minWidth:0" footgun). resvg then crops at the viewBox, swallowing
 * the trailing glyphs without a warning. This module scans the SVG that Satori
 * produces, accumulates `<g transform="...">` matrices on a stack to obtain the
 * absolute x-extent of every path command, and reports overflow vs. the canvas
 * width when detected.
 *
 * Scope (v1):
 *   - Supports <g transform="translate(x[,y])"> and <g transform="matrix(a,b,c,d,e,f)">.
 *     Satori 0.26 encodes CSS transforms into these two forms.
 *   - Skips content inside <mask> and <clipPath> — masks are not rasterised to
 *     the canvas, so overflow there is irrelevant.
 *   - Samples curve endpoints AND control points for Q/C/S/T commands so that
 *     bezier overshoot (1–5 px past the endpoint) is captured.
 *   - Returns null when the canvas width cannot be determined or no overflow
 *     is detected.
 *
 * Known limitations:
 *   - rotate/scale-around-origin transforms expressed via matrix(...) WITH a
 *     non-zero b or c component are not bounded correctly (we only consider the
 *     a and e coefficients for x). False negatives possible but no false positives.
 *   - Arc (A/a) commands are treated as straight segments to their endpoint;
 *     elliptical bulge is not modelled. Acceptable for receipt-text use cases.
 */

/** Result of a successful overflow detection. */
export type CanvasOverflow = {
  /** Output canvas width in pixels (parsed from <svg width=…> or viewBox). */
  readonly widthPx: number;
  /** Pixels by which the rendered content exceeds widthPx, rounded up to the
   *  nearest integer for stable warning payloads. Always >= 1 when non-null. */
  readonly overflowPx: number;
};

/** 2×3 affine transform [a, b, c, d, e, f] mapping (x,y) → (a·x + c·y + e, b·x + d·y + f). */
type Matrix = readonly [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** Apply CTM to a local x — y is irrelevant for canvas-x overflow checks
 *  EXCEPT when the matrix has non-zero c (shear/rotation). We model y=0 for the
 *  bounds estimate; rotated-text overflow is documented as out-of-scope. */
function applyX(m: Matrix, x: number): number {
  return m[0] * x + m[4];
}

/** Multiply two affine matrices: m1 * m2 (m1 applied AFTER m2 in column-vector convention). */
function compose(m1: Matrix, m2: Matrix): Matrix {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/** Parse a single `transform=` attribute value (translate / matrix only). Unknown
 *  forms collapse to identity — we'd rather under-report than crash. */
function parseTransform(raw: string): Matrix {
  let m: Matrix = IDENTITY;
  // Matrix may contain multiple chained ops, e.g. "translate(10,0) matrix(...)".
  const ops = raw.matchAll(/(translate|matrix)\s*\(([^)]+)\)/g);
  for (const op of ops) {
    const body = op[2] ?? "";
    const args = body
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    if (op[1] === "translate" && args.length >= 1) {
      m = compose(m, [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0]);
    } else if (op[1] === "matrix" && args.length === 6) {
      const [a, b, c, d, e, f] = args as [number, number, number, number, number, number];
      m = compose(m, [a, b, c, d, e, f]);
    }
  }
  return m;
}

/** Parse canvas width from <svg> root: prefer the `width=` attribute, fall back
 *  to the third viewBox value. Returns null when neither is present/parseable. */
function parseCanvasWidth(svg: string): number | null {
  const svgTag = svg.match(/<svg\b[^>]*>/);
  if (!svgTag) return null;
  const widthAttr = svgTag[0].match(/\bwidth\s*=\s*"(-?\d+(?:\.\d+)?)"/);
  if (widthAttr) {
    const w = Number(widthAttr[1]);
    if (Number.isFinite(w) && w > 0) return w;
  }
  const vb = svgTag[0].match(
    /viewBox\s*=\s*"\s*-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+(-?\d+(?:\.\d+)?)\s+/,
  );
  if (vb) {
    const w = Number(vb[1]);
    if (Number.isFinite(w) && w > 0) return w;
  }
  return null;
}

/** Extract all numeric arguments from a path `d` attribute, broken into command
 *  groups. Each group is `[command, ...args]`. SVG path grammar tolerates a wide
 *  variety of separators (commas, whitespace, sign-as-separator); we normalize. */
function parsePathCommands(d: string): Array<[string, number[]]> {
  const groups: Array<[string, number[]]> = [];
  // Split on command letters while keeping them as group anchors.
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex walk.
  while ((match = re.exec(d)) !== null) {
    const cmd = match[1] ?? "";
    const rest = match[2] ?? "";
    // Numbers may be separated by ',' or whitespace, with optional leading sign
    // attached to a digit (e.g. "10-5" → 10, -5). Insert spaces before signs.
    const normalized = rest.replace(/(\d)-/g, "$1 -").replace(/(\d)\+/g, "$1 +");
    const args = normalized
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    groups.push([cmd, args]);
  }
  return groups;
}

/** Walk path commands, applying the CTM to each x-emitting endpoint and control
 *  point, returning the maximum absolute x reached. Updates currentX/Y as it
 *  walks. Control points contribute too — quadratic/cubic curves can bulge past
 *  their endpoints. */
function maxXFromPath(d: string, ctm: Matrix): number {
  let max = Number.NEGATIVE_INFINITY;
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;

  for (const [cmd, args] of parsePathCommands(d)) {
    const isRel = cmd === cmd.toLowerCase();
    const upper = cmd.toUpperCase();

    /** Consume `count` x,y pairs from args; emit each x (and control xs) into max. */
    const at = (idx: number): number => args[idx] ?? 0;

    const consumePairs = (count: number): void => {
      for (let i = 0; i + 2 * count <= args.length; i += 2 * count) {
        for (let p = 0; p < count; p++) {
          const x = isRel ? cx + at(i + 2 * p) : at(i + 2 * p);
          const y = isRel ? cy + at(i + 2 * p + 1) : at(i + 2 * p + 1);
          max = Math.max(max, applyX(ctm, x));
          if (p === count - 1) {
            cx = x;
            cy = y;
          }
        }
      }
    };

    if (upper === "M") {
      if (args.length >= 2) {
        const x = isRel ? cx + at(0) : at(0);
        const y = isRel ? cy + at(1) : at(1);
        max = Math.max(max, applyX(ctm, x));
        cx = x;
        cy = y;
        startX = x;
        startY = y;
        for (let i = 2; i + 1 < args.length; i += 2) {
          const lx = isRel ? cx + at(i) : at(i);
          const ly = isRel ? cy + at(i + 1) : at(i + 1);
          max = Math.max(max, applyX(ctm, lx));
          cx = lx;
          cy = ly;
        }
      }
    } else if (upper === "L" || upper === "T") {
      consumePairs(1);
    } else if (upper === "H") {
      for (const v of args) {
        const x = isRel ? cx + v : v;
        max = Math.max(max, applyX(ctm, x));
        cx = x;
      }
    } else if (upper === "V") {
      for (const v of args) {
        cy = isRel ? cy + v : v;
      }
    } else if (upper === "Q" || upper === "S") {
      consumePairs(2);
    } else if (upper === "C") {
      consumePairs(3);
    } else if (upper === "A") {
      // Arc: 7 args per command. Only the endpoint (last x,y) matters for our
      // bounds estimate; arc bulge is out of scope.
      for (let i = 0; i + 7 <= args.length; i += 7) {
        const x = isRel ? cx + at(i + 5) : at(i + 5);
        const y = isRel ? cy + at(i + 6) : at(i + 6);
        max = Math.max(max, applyX(ctm, x));
        cx = x;
        cy = y;
      }
    } else if (upper === "Z") {
      cx = startX;
      cy = startY;
    }
  }
  return max;
}

/**
 * Scan an SVG string for the maximum absolute x-coordinate reached by any
 * visible path element. Returns overflow info when that x exceeds the canvas
 * width, or null otherwise.
 *
 * Implementation: linear regex-driven walk maintaining a transform stack across
 * `<g transform="…">` open/close pairs. Content inside `<mask>` and `<clipPath>`
 * is skipped — those elements never rasterise to the visible canvas.
 *
 * @param svg - Raw SVG produced by Satori.
 * @returns Overflow report or null when within bounds / width unknown.
 */
export function measureSvgBounds(svg: string): CanvasOverflow | null {
  const widthPx = parseCanvasWidth(svg);
  if (widthPx === null) return null;

  const ctmStack: Matrix[] = [IDENTITY];
  let skipDepth = 0; // >0 when inside <mask> or <clipPath>.
  let maxX = Number.NEGATIVE_INFINITY;

  // Tokenize: walk every tag in document order.
  const tagRe = /<(\/?)(\w+)([^>]*)>/g;
  let token: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex walk.
  while ((token = tagRe.exec(svg)) !== null) {
    const closing = token[1] === "/";
    const tag = token[2] ?? "";
    const attrs = token[3] ?? "";

    if (tag === "mask" || tag === "clipPath") {
      skipDepth += closing ? -1 : 1;
      continue;
    }

    if (skipDepth > 0) continue;

    if (tag === "g") {
      if (closing) {
        if (ctmStack.length > 1) ctmStack.pop();
      } else {
        const tAttr = attrs.match(/\btransform\s*=\s*"([^"]+)"/);
        const local = tAttr?.[1] ? parseTransform(tAttr[1]) : IDENTITY;
        const parent = ctmStack[ctmStack.length - 1] ?? IDENTITY;
        ctmStack.push(compose(parent, local));
      }
      continue;
    }

    if (tag === "path" && !closing) {
      const dAttr = attrs.match(/\bd\s*=\s*"([^"]+)"/);
      if (dAttr?.[1]) {
        const ctm = ctmStack[ctmStack.length - 1] ?? IDENTITY;
        const m = maxXFromPath(dAttr[1], ctm);
        if (m > maxX) maxX = m;
      }
    }
  }

  if (!Number.isFinite(maxX)) return null;
  const overflowRaw = maxX - widthPx;
  if (overflowRaw <= 0) return null;
  return {
    widthPx,
    overflowPx: Math.ceil(overflowRaw),
  };
}

/** Hint message shared between the `warn` log and the `throw` error message —
 *  single source of truth for the actionable guidance pointing block authors at
 *  the flex-layout footgun this detector exists to catch. */
const OVERFLOW_HINT =
  "A block rendered content beyond canvas width — resvg is silently cropping. " +
  "Add minWidth:0 / flexGrow:1 to text-bearing flex children, or flexShrink:0 to fixed-width siblings.";

/**
 * Apply the configured policy when overflow is detected. Centralised so the
 * Node and browser render paths emit identical diagnostics (ADR-0018 mirror
 * requirement). `null` overflow is a no-op.
 *
 * @param overflow - Result of `measureSvgBounds` (may be null).
 * @param policy - Render-time `onCanvasOverflow` option.
 * @param logger - Logger used when policy is `"warn"`.
 * @throws Error when policy is `"throw"` and overflow is non-null.
 */
export function applyOverflowPolicy(
  overflow: CanvasOverflow | null,
  policy: "warn" | "throw" | "ignore",
  logger: { warn: (msg: string, fields?: Record<string, unknown>) => void },
): void {
  if (overflow === null) return;
  if (policy === "throw") {
    throw new Error(
      `Canvas overflow detected: rendered content extends ${overflow.overflowPx}px past canvas width ${overflow.widthPx}px. ${OVERFLOW_HINT}`,
    );
  }
  if (policy === "warn") {
    logger.warn("Canvas overflow detected", {
      widthPx: overflow.widthPx,
      overflowPx: overflow.overflowPx,
      hint: OVERFLOW_HINT,
    });
  }
}
