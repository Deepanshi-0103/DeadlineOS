import type { Config } from "tailwindcss";

/**
 * DeadlineOS Aesthetic Tokens
 * Nude paper · soft lilac brand · peach accent · rose alerts
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: "rgb(var(--color-base) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-hover": "rgb(var(--color-surface-hover) / <alpha-value>)",
        "surface-raised": "rgb(var(--color-surface-raised) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        "line-soft": "rgb(var(--color-line-soft) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--color-ink-muted) / <alpha-value>)",
        "ink-faint": "rgb(var(--color-ink-faint) / <alpha-value>)",

        brand: "rgb(var(--color-brand) / <alpha-value>)",
        "brand-soft": "rgba(167, 139, 250, 0.14)",
        "brand-muted": "rgba(167, 139, 250, 0.08)",
        "brand-border": "rgba(167, 139, 250, 0.28)",
        "brand-hover": "#8B6FE8",

        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-soft": "rgba(244, 178, 148, 0.18)",
        "accent-border": "rgba(244, 178, 148, 0.35)",

        lilac: "rgb(var(--color-lilac) / <alpha-value>)",
        mint: "rgb(var(--color-mint) / <alpha-value>)",
        sky: "rgb(var(--color-sky) / <alpha-value>)",
        rose: "rgb(var(--color-rose) / <alpha-value>)",

        "on-brand": "#FFFFFF",

        critical: "#D47474",
        "critical-soft": "rgba(228, 140, 140, 0.16)",
        warning: "#E0A070",
        "warning-soft": "rgba(224, 160, 112, 0.16)",
        safe: "#6BAF96",
        "safe-soft": "rgba(167, 210, 190, 0.22)",
      },
      fontFamily: {
        display: ["var(--font-display)", "DM Sans", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "DM Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "DM Mono", "monospace"],
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem",
        pill: "999px",
      },
      boxShadow: {
        "brand-sm": "0 4px 16px -4px rgba(167, 139, 250, 0.28)",
        "brand-md": "0 10px 28px -8px rgba(167, 139, 250, 0.32)",
        "brand-lg": "0 16px 40px -12px rgba(167, 139, 250, 0.36)",
        soft: "0 1px 2px rgba(42,36,32,0.04), 0 8px 24px -10px rgba(42,36,32,0.1)",
        "soft-lg": "0 2px 4px rgba(42,36,32,0.04), 0 16px 40px -16px rgba(42,36,32,0.14)",
        "inner-soft": "inset 0 1px 3px rgba(42,36,32,0.04)",
        rose: "0 8px 24px -10px rgba(212, 116, 116, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
