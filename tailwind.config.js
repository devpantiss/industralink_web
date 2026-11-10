/** Colours come from CSS variables in src/styles/index.css (design tokens). */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  /* dark: classes apply only when dark mode is picked (lib/theme.ts). */
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: { DEFAULT: v("surface"), muted: v("surface-muted"), strong: v("surface-strong") },
        border: { DEFAULT: v("border"), strong: v("border-strong") },
        /* ink-fill: solid "dark" pills and buttons (near-black in light, raised slate in dark). */
        ink: { DEFAULT: v("text"), secondary: v("text-secondary"), muted: v("text-muted"), fill: v("ink-fill") },
        "on-ink": v("on-ink"),
        primary: { DEFAULT: v("primary"), hover: v("primary-hover"), soft: v("primary-soft") },
        navy: v("brand-navy"),
        accent: { DEFAULT: v("accent"), on: v("on-accent") },
        neutral: { fg: v("neutral-fg"), bg: v("neutral-bg") },
        info: { fg: v("info-fg"), bg: v("info-bg") },
        interview: { fg: v("interview-fg"), bg: v("interview-bg") },
        success: { fg: v("success-fg"), bg: v("success-bg") },
        warning: { fg: v("warning-fg"), bg: v("warning-bg") },
        danger: { fg: v("danger-fg"), bg: v("danger-bg") },
        /* Pastel fact tiles: bg-tile-green + text-tile-green-ink */
        tile: {
          green: v("pg"), "green-ink": v("pg-ink"), blue: v("pb"), "blue-ink": v("pb-ink"),
          orange: v("po"), "orange-ink": v("po-ink"), purple: v("pp"), "purple-ink": v("pp-ink"),
          rose: v("pr"), "rose-ink": v("pr-ink"), yellow: v("py"), "yellow-ink": v("py-ink"),
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "Inter", '"Noto Sans Devanagari"', '"Noto Sans Oriya"', '"Noto Sans Bengali"', '"Noto Sans Telugu"', '"Noto Sans Tamil"', "system-ui", "sans-serif"],
      },
      fontSize: {
        caption: ["12px", { lineHeight: "16px" }],
        small: ["13px", { lineHeight: "18px" }],
        body: ["14px", { lineHeight: "20px" }],
        "body-lg": ["16px", { lineHeight: "24px" }],
        h3: ["16px", { lineHeight: "24px", fontWeight: "600" }],
        h2: ["18px", { lineHeight: "28px", fontWeight: "600", letterSpacing: "-0.01em" }],
        h1: ["24px", { lineHeight: "32px", fontWeight: "700", letterSpacing: "-0.02em" }],
        display: ["30px", { lineHeight: "36px", fontWeight: "700", letterSpacing: "-0.025em" }],
      },
      borderRadius: { sm: "8px", md: "10px", lg: "16px", xl: "20px", "2xl": "24px" },
      boxShadow: {
        xs: "0 1px 2px rgb(21 25 30 / .04)",
        md: "0 12px 32px -14px rgb(21 25 30 / .22)",
        lg: "0 24px 60px -20px rgb(21 25 30 / .28)",
      },
      transitionTimingFunction: { brand: "cubic-bezier(0.2, 0, 0, 1)" },
      maxWidth: { content: "1360px" },
    },
  },
  plugins: [],
};
