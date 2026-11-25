/**
 * Empty-state illustrations, drawn as simple shapes on a 160 × 120 canvas.
 * Colours are roles, so each app paints them with its own theme (light and dark):
 * blob = soft brand background, card = surface, line = soft grey, primary, accent,
 * white = marks drawn on top of the primary colour.
 * The web dashboard and the phone app share this exact data.
 */
export type ArtRole = "blob" | "card" | "line" | "primary" | "accent" | "white";

interface Paint {
  fill?: ArtRole;
  stroke?: ArtRole;
  width?: number;
  opacity?: number;
  dash?: string;
}

export type ArtShape =
  | ({ kind: "circle"; cx: number; cy: number; r: number } & Paint)
  | ({ kind: "rect"; x: number; y: number; w: number; h: number; rx?: number } & Paint)
  | ({ kind: "path"; d: string } & Paint);

const circle = (cx: number, cy: number, r: number, paint: Paint): ArtShape => ({ kind: "circle", cx, cy, r, ...paint });
const rect = (x: number, y: number, w: number, h: number, rx: number, paint: Paint): ArtShape => ({ kind: "rect", x, y, w, h, rx, ...paint });
const path = (d: string, paint: Paint): ArtShape => ({ kind: "path", d, ...paint });

const blob = circle(80, 62, 46, { fill: "blob" });
const card: Paint = { fill: "card", stroke: "line", width: 2 };
const bar = (x: number, y: number, w: number) => rect(x, y, w, 6, 3, { fill: "line" });

export const ART = {
  search: [
    blob,
    rect(40, 30, 64, 54, 10, card),
    bar(52, 44, 28),
    bar(52, 56, 40),
    bar(52, 68, 22),
    circle(106, 78, 17, { fill: "card", stroke: "primary", width: 6 }),
    path("M118 90 L130 102", { stroke: "primary", width: 8 }),
    circle(34, 34, 4, { fill: "accent" }),
    circle(128, 30, 3, { fill: "primary" }),
  ],
  jobs: [
    blob,
    rect(66, 34, 28, 18, 6, { stroke: "primary", width: 5 }),
    rect(42, 46, 76, 48, 10, { fill: "primary" }),
    rect(42, 62, 76, 8, 0, { fill: "white", opacity: 0.25 }),
    rect(72, 58, 16, 16, 4, { fill: "accent" }),
    circle(126, 34, 4, { fill: "accent" }),
    circle(34, 88, 3, { fill: "primary" }),
  ],
  applications: [
    blob,
    rect(50, 26, 60, 76, 10, card),
    rect(66, 20, 28, 14, 5, { fill: "primary" }),
    circle(64, 50, 5, { fill: "primary" }),
    bar(74, 47, 26),
    circle(64, 66, 5, { fill: "accent" }),
    bar(74, 63, 22),
    circle(64, 82, 5, { fill: "line" }),
    bar(74, 79, 18),
  ],
  messages: [
    blob,
    rect(32, 30, 66, 38, 14, { fill: "primary" }),
    path("M46 66 L42 80 L60 67 Z", { fill: "primary" }),
    circle(52, 49, 4, { fill: "white" }),
    circle(65, 49, 4, { fill: "white" }),
    circle(78, 49, 4, { fill: "white" }),
    rect(66, 58, 62, 36, 14, card),
    bar(78, 70, 38),
    bar(78, 80, 24),
    circle(132, 34, 4, { fill: "accent" }),
  ],
  notifications: [
    blob,
    path("M40 44 Q34 56 40 68", { stroke: "line", width: 4 }),
    path("M120 44 Q126 56 120 68", { stroke: "line", width: 4 }),
    circle(80, 28, 4, { fill: "primary" }),
    path("M80 30 C64 30 56 42 56 56 L56 72 L48 82 L112 82 L104 72 L104 56 C104 42 96 30 80 30 Z", { fill: "primary" }),
    circle(80, 90, 7, { fill: "accent" }),
    circle(104, 38, 9, { fill: "accent", stroke: "card", width: 3 }),
  ],
  saved: [
    blob,
    rect(44, 28, 62, 72, 10, card),
    rect(56, 40, 16, 16, 4, { fill: "accent" }),
    bar(56, 64, 38),
    bar(56, 76, 26),
    path("M96 20 L120 20 L120 58 L108 48 L96 58 Z", { fill: "primary" }),
    circle(36, 84, 3, { fill: "primary" }),
  ],
  people: [
    blob,
    circle(98, 48, 13, card),
    path("M74 96 C74 78 86 68 98 68 C110 68 122 78 122 96 Z", card),
    circle(66, 52, 15, { fill: "primary" }),
    path("M38 100 C38 80 52 72 66 72 C80 72 94 80 94 100 Z", { fill: "primary" }),
    circle(126, 32, 4, { fill: "accent" }),
  ],
  done: [
    blob,
    circle(80, 60, 30, { fill: "primary" }),
    path("M66 60 L76 70 L96 50", { stroke: "white", width: 7 }),
    rect(38, 34, 8, 8, 2, { fill: "accent" }),
    rect(118, 30, 7, 7, 2, { fill: "primary" }),
    circle(124, 86, 4, { fill: "accent" }),
    circle(38, 86, 3, { fill: "primary" }),
  ],
  company: [
    blob,
    rect(46, 34, 50, 66, 6, card),
    rect(56, 44, 8, 8, 2, { fill: "line" }),
    rect(68, 44, 8, 8, 2, { fill: "accent" }),
    rect(80, 44, 8, 8, 2, { fill: "line" }),
    rect(56, 58, 8, 8, 2, { fill: "line" }),
    rect(68, 58, 8, 8, 2, { fill: "line" }),
    rect(80, 58, 8, 8, 2, { fill: "line" }),
    rect(65, 84, 12, 16, 2, { fill: "primary" }),
    rect(96, 56, 24, 44, 5, { fill: "primary" }),
    circle(34, 40, 3, { fill: "primary" }),
  ],
  chart: [
    blob,
    rect(36, 30, 88, 64, 10, card),
    rect(52, 64, 12, 20, 3, { fill: "line" }),
    rect(70, 54, 12, 30, 3, { fill: "accent" }),
    rect(88, 44, 12, 40, 3, { fill: "primary" }),
    rect(48, 84, 64, 2, 1, { fill: "line" }),
    circle(130, 28, 3, { fill: "primary" }),
  ],
  notFound: [
    blob,
    path("M36 92 C52 72 70 96 88 78", { stroke: "line", width: 3, dash: "4 6" }),
    circle(36, 92, 5, { fill: "accent" }),
    path("M100 28 C86 28 78 38 78 50 C78 66 100 88 100 88 C100 88 122 66 122 50 C122 38 114 28 100 28 Z", { fill: "primary" }),
    circle(100, 50, 8, { fill: "white" }),
  ],
} satisfies Record<string, ArtShape[]>;

export type ArtName = keyof typeof ART;
