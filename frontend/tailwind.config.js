/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/renderer/index.html", "./src/renderer/src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 테마 시스템 CSS 변수 참조
        theme: {
          bg: "var(--theme-bg)",
          "bg-secondary": "var(--theme-bg-secondary)",
          surface: "var(--theme-surface)",
          "surface-hover": "var(--theme-surface-hover)",
          text: "var(--theme-text)",
          "text-secondary": "var(--theme-text-secondary)",
          "text-muted": "var(--theme-text-muted)",
          primary: "var(--theme-primary)",
          "primary-hover": "var(--theme-primary-hover)",
          "primary-text": "var(--theme-primary-text)",
          accent: "var(--theme-accent)",
          "accent-hover": "var(--theme-accent-hover)",
          border: "var(--theme-border)",
          "border-strong": "var(--theme-border-strong)",
          success: "var(--theme-success)",
          error: "var(--theme-error)",
          warning: "var(--theme-warning)",
          info: "var(--theme-info)",
        },

        // primary 팔레트 - 테마 CSS 변수 기반 (테마 변경 시 자동 반영)
        // 주요 shade(DEFAULT, 500, 600, 700)를 CSS 변수로 → 테마 전환 시 자동 반영
        primary: {
          DEFAULT: "var(--theme-primary, #8E3524)",
          50: "var(--theme-primary-50, #fdf3f1)",
          100: "var(--theme-primary-100, #fbe6e1)",
          200: "var(--theme-primary-200, #f8cfc7)",
          300: "var(--theme-primary-300, #f2aea0)",
          400: "var(--theme-primary-400, #e8826d)",
          500: "var(--theme-primary, #8E3524)",
          600: "var(--theme-primary, #8E3524)",
          700: "var(--theme-primary, #8E3524)",
          800: "var(--theme-primary-hover, #7a3125)",
          900: "var(--theme-primary-900, #672e25)",
          950: "var(--theme-primary-950, #38140f)",
        },
        accent: {
          DEFAULT: "var(--theme-accent)",
          light: "#e07a47",
          dark: "var(--theme-accent-hover)",
        },
        cream: {
          DEFAULT: "var(--theme-bg)",
          dark: "var(--theme-bg-secondary)",
        },
        kiosk: {
          background: "var(--theme-bg)",
          surface: "var(--theme-surface)",
          border: "var(--theme-border)",
          text: "var(--theme-text)",
          muted: "var(--theme-text-muted)",
        },

        // 접근성 색상 (기존 a11y 변수 → 테마 변수로 통합)
        a11y: {
          bg: "var(--theme-bg)",
          "bg-secondary": "var(--theme-bg-secondary)",
          surface: "var(--theme-surface)",
          text: "var(--theme-text)",
          "text-secondary": "var(--theme-text-secondary)",
          primary: "var(--theme-primary)",
          accent: "var(--theme-accent)",
          border: "var(--theme-border)",
          "border-strong": "var(--theme-border-strong)",
          success: "var(--theme-success)",
          error: "var(--theme-error)",
          warning: "var(--theme-warning)",
          "button-text": "var(--theme-primary-text)",
        },
      },

      fontFamily: {
        sans: ["var(--theme-font-sans)", "Pretendard", "system-ui", "sans-serif"],
        display: ["var(--theme-font-display)", "Pretendard", "system-ui", "sans-serif"],
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
        kiosk: "var(--theme-radius-lg, 0.75rem)",
        "theme-sm": "var(--theme-radius-sm)",
        "theme-md": "var(--theme-radius-md)",
        "theme-lg": "var(--theme-radius-lg)",
        "theme-xl": "var(--theme-radius-xl)",
      },

      boxShadow: {
        "theme-sm": "var(--theme-shadow-sm)",
        "theme-md": "var(--theme-shadow-md)",
        "theme-lg": "var(--theme-shadow-lg)",
        "theme-xl": "var(--theme-shadow-xl)",
      },

      transitionDuration: {
        press: "var(--theme-press-duration)",
      },

      scale: {
        press: "var(--theme-press-scale)",
      },
    },
  },
  plugins: [],
};
