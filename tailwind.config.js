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
      borderRadius: { sm: "8px", md: "10px", lg: "14px", xl: "16px", "2xl": "20px" },
      boxShadow: {
        xs: "0 1px 2px rgb(15 23 42 / .04), 0 1px 1px rgb(15 23 42 / .02)",
        md: "0 2px 4px rgb(15 23 42 / .03), 0 8px 24px -6px rgb(15 23 42 / .10)",
        lg: "0 4px 8px rgb(15 23 42 / .04), 0 20px 48px -12px rgb(15 23 42 / .18)",
      },
      transitionTimingFunction: { brand: "cubic-bezier(0.2, 0, 0, 1)" },
      maxWidth: { content: "1280px" },
    },
  },
  plugins: [],
};
