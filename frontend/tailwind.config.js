/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/renderer/index.html", "./src/renderer/src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#8E3524",
          50: "#fdf3f1",
          100: "#fbe6e1",
          200: "#f8cfc7",
          300: "#f2aea0",
          400: "#e8826d",
          500: "#d95d44",
          600: "#c64a31",
          700: "#8E3524",
          800: "#7a3125",
          900: "#672e25",
          950: "#38140f",
        },
        accent: {
          DEFAULT: "#C96231",
          light: "#e07a47",
          dark: "#a54f26",
        },
        cream: {
          DEFAULT: "#FDF9F3",
          dark: "#f5ede0",
        },
        kiosk: {
          background: "#FDF9F3",
          surface: "#ffffff",
          border: "#e2e8f0",
          text: "#1e293b",
          muted: "#64748b",
        },
        a11y: {
          bg: "var(--a11y-bg)",
          "bg-secondary": "var(--a11y-bg-secondary)",
          surface: "var(--a11y-surface)",
          text: "var(--a11y-text)",
          "text-secondary": "var(--a11y-text-secondary)",
          primary: "var(--a11y-primary)",
          accent: "var(--a11y-accent)",
          border: "var(--a11y-border)",
          "border-strong": "var(--a11y-border-strong)",
          success: "var(--a11y-success)",
          error: "var(--a11y-error)",
          warning: "var(--a11y-warning)",
          "button-text": "var(--a11y-button-text)",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
      fontSize: {
        "kiosk-xs": ["0.875rem", { lineHeight: "1.25rem" }],
        "kiosk-sm": ["1rem", { lineHeight: "1.5rem" }],
        "kiosk-base": ["1.125rem", { lineHeight: "1.75rem" }],
        "kiosk-lg": ["1.25rem", { lineHeight: "1.75rem" }],
        "kiosk-xl": ["1.5rem", { lineHeight: "2rem" }],
        "kiosk-2xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "kiosk-3xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
      spacing: {
        "kiosk-touch": "3rem",
      },
      borderRadius: {
        kiosk: "0.75rem",
      },
    },
  },
  plugins: [],
};
