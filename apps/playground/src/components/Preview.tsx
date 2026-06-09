/**
 * @fileoverview Preview pane — CSS-scaled PNG with pixelated rendering to
 * preserve 1-bit dithering. Includes a stale-render indicator.
 */

import type { JSX } from "react";
import { useCallback, useRef, useState } from "react";

type PreviewProps = {
  src: string | null;
  canonicalWidth: number;
  isLoading: boolean;
  error: string | null;
  isStale: boolean;
  onRetry: () => void;
  onGenerate: () => void;
  onResetZoom: () => void;
};

export function Preview({
  src,
  canonicalWidth,
  isLoading,
  error,
  isStale,
  onRetry,
  onGenerate,
  onResetZoom,
}: PreviewProps): JSX.Element {
  const [displayedWidth, setDisplayedWidth] = useState(canonicalWidth);
  // Callback ref: rebinds the ResizeObserver every time the <img> mounts or
  // remounts. The previous useEffect-with-empty-deps pattern attached the
  // observer ONCE on first render — but on first render src===null and the
  // img wasn't mounted, so the observer never bound. The footer scale
  // ratio stayed frozen at its initial value (canonical/canonical = 1.00x)
  // for the whole session.
  const observerRef = useRef<ResizeObserver | null>(null);
  const imgRef = useCallback((el: HTMLImageElement | null) => {
    if (observerRef.current !== null) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (el === null) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) return;
      setDisplayedWidth(entry.contentRect.width);
    });
    obs.observe(el);
    observerRef.current = obs;
  }, []);

  if (error !== null) {
    return (
      <div className="preview preview-error">
        <pre>{error}</pre>
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (src === null) {
    return (
      <div className="preview preview-empty">
        <button type="button" className="preview-cta" onClick={onGenerate} disabled={isLoading}>
          {isLoading ? "Loading…" : "Click to generate image"}
        </button>
        <p className="preview-empty-hint">
          First render boots the WebAssembly engine and fetches the active theme's font.
        </p>
      </div>
    );
  }

  const scale = canonicalWidth > 0 ? displayedWidth / canonicalWidth : 1;
  return (
    <div className="preview preview-with-image">
      {isStale ? (
        <div className="preview-stale-banner" role="status">
          ⚠ Stale — click Render to update
        </div>
      ) : null}
      {isLoading ? <div className="preview-loading-strip">rendering…</div> : null}
      <div className="preview-scroll" style={{ opacity: isStale ? 0.6 : 1 }}>
        <img
          ref={imgRef}
          src={src}
          alt="Composition preview"
          className="preview-img"
          style={{ maxWidth: `${canonicalWidth}px` }}
        />
      </div>
      <div className="preview-footer">
        displayed at {scale.toFixed(2)}x
        {Math.abs(scale - 1) > 0.01 ? (
          <>
            {" "}
            <button type="button" className="preview-footer-reset" onClick={onResetZoom}>
              → 1×
            </button>
          </>
        ) : null}{" "}
        · canonical {canonicalWidth}px
      </div>
    </div>
  );
}
