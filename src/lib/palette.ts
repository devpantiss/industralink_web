/**
 * The app has one colour theme ("Cobalt", see styles/index.css). Older builds let
 * people pick a palette; this clears any saved choice so everyone sees the same look.
 */
export function initPalette() {
  document.documentElement.removeAttribute("data-palette");
  try { localStorage.removeItem("industrialink.palette"); } catch { /* ignore */ }
}
