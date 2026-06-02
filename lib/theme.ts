// Canvas draw colors, mirroring the CSS custom properties defined in index.css.
// The canvas 2D context can't read CSS variables cheaply, so the playfield
// colors live here as the single source of truth for rendering. The full Base
// palette (used by the UI chrome) lives in index.css as CSS variables.
//
// Verified Base palette references:
//   base-blue #0000ff · cerulean #3c8aff · gray-100 #0a0b0d · yellow #ffd12f
export const CANVAS = {
  boardBg: "#0a0b0d", // gray-100, near-black playfield
  gridDot: "rgba(255, 255, 255, 0.06)",
  snakeHead: "#ffffff", // bright leading cell for visibility
  snakeBody: "#0000ff", // Base Blue — the hero accent
  food: "#ffd12f", // yellow, warm contrast against blue + black
} as const;
