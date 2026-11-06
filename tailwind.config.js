/** Colours come from CSS variables in src/styles/index.css (design tokens). */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: { DEFAULT: v("surface"), muted: v("surface-muted") },
        border: { DEFAULT: v("border"), strong: v("border-strong") },
        ink: { DEFAULT: v("text"), secondary: v("text-secondary"), muted: v("text-muted") },
        primary: { DEFAULT: v("primary"), hover: v("primary-hover"), soft: v("primary-soft") },
        navy: v("brand-navy"),
        accent: { DEFAULT: v("accent"), on: v("on-accent") },
        neutral: { fg: v("neutral-fg"), bg: v("neutral-bg") },
        info: { fg: v("info-fg"), bg: v("info-bg") },
        interview: { fg: v("interview-fg"), bg: v("interview-bg") },
        success: { fg: v("success-fg"), bg: v("success-bg") },
        warning: { fg: v("warning-fg"), bg: v("warning-bg") },
        danger: { fg: v("danger-fg"), bg: v("danger-bg") },
      },
      fontFamily: {
        sans: ['"Noto Sans"', '"Noto Sans Devanagari"', "system-ui", "sans-serif"],
      },
      fontSize: {
        caption: ["12px", { lineHeight: "16px" }],
        small: ["13px", { lineHeight: "18px" }],
        body: ["14px", { lineHeight: "21px" }],
        "body-lg": ["16px", { lineHeight: "24px" }],
        h3: ["16px", { lineHeight: "24px", fontWeight: "600" }],
        h2: ["18px", { lineHeight: "28px", fontWeight: "600" }],
        h1: ["24px", { lineHeight: "32px", fontWeight: "700" }],
        display: ["30px", { lineHeight: "36px", fontWeight: "600" }],
      },
      borderRadius: { sm: "6px", md: "8px", lg: "12px" },
      boxShadow: {
        xs: "0 1px 2px rgb(15 23 42 / .05)",
        md: "0 4px 12px rgb(15 23 42 / .08)",
        lg: "0 12px 32px rgb(15 23 42 / .12)",
      },
      transitionTimingFunction: { brand: "cubic-bezier(0.2, 0, 0, 1)" },
      maxWidth: { content: "1200px" },
    },
  },
  plugins: [],
};
