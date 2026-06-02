import type { PointerEvent } from "react";
import type { Dir } from "../lib/types";

// On-screen directional pad for touch play. It does NOT own any direction
// state — it just calls back into the same `onDir` the keyboard and swipe
// handlers use, so the opposite-direction guard lives in one place (App).
export default function DPad({ onDir, disabled = false }: { onDir: (d: Dir) => void; disabled?: boolean }) {
  // pointerdown (not click) for snappy response, and preventDefault so a
  // press on the pad never scrolls or zooms the page inside the webview.
  const press = (d: Dir) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (disabled) return;
    onDir(d);
  };

  return (
    <div className="dpad" role="group" aria-label="direction controls" aria-disabled={disabled}>
      <button
        className="dpad-btn dpad-up"
        onPointerDown={press("up")}
        disabled={disabled}
        aria-label="move up"
      >
        ▲
      </button>
      <button
        className="dpad-btn dpad-left"
        onPointerDown={press("left")}
        disabled={disabled}
        aria-label="move left"
      >
        ◀
      </button>
      <button
        className="dpad-btn dpad-right"
        onPointerDown={press("right")}
        disabled={disabled}
        aria-label="move right"
      >
        ▶
      </button>
      <button
        className="dpad-btn dpad-down"
        onPointerDown={press("down")}
        disabled={disabled}
        aria-label="move down"
      >
        ▼
      </button>
    </div>
  );
}
