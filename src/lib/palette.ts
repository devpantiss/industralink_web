/**
 * Brand colour options. The real values live in styles/index.css; this only
 * switches between them. Once one is chosen, the switcher can be removed.
 */
export type Palette = "teal" | "orange" | "graphite";

export const PALETTES: { value: Palette; label: string; swatch: [string, string] }[] = [
  { value: "teal", label: "Deep Teal", swatch: ["#0F1C1F", "#0F766E"] },
  { value: "orange", label: "Industrial Orange", swatch: ["#18181B", "#C2410C"] },
  { value: "graphite", label: "Graphite", swatch: ["#111827", "#F59E0B"] },
];

const KEY = "industrialink.palette";

export function getPalette(): Palette {
  try {
    const v = localStorage.getItem(KEY);
    return PALETTES.some((p) => p.value === v) ? (v as Palette) : "teal";
  } catch {
    return "teal";
  }
}

export function applyPalette(p: Palette) {
  if (p === "teal") document.documentElement.removeAttribute("data-palette");
  else document.documentElement.setAttribute("data-palette", p);
  try { localStorage.setItem(KEY, p); } catch { /* ignore */ }
}

/** Call once at start-up. Also accepts ?palette=orange in the URL for quick comparison. */
export function initPalette() {
  const fromUrl = new URLSearchParams(window.location.search).get("palette") as Palette | null;
  applyPalette(fromUrl && PALETTES.some((p) => p.value === fromUrl) ? fromUrl : getPalette());
}
