import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "var(--background)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          "50": "rgba(17, 22, 29, 0.5)",
          "30": "rgba(17, 22, 29, 0.3)",
        },
        "surface-hover": "var(--surface-hover)",
        border: {
          DEFAULT: "var(--border)",
          "50": "rgba(30, 37, 48, 0.5)",
          "30": "rgba(30, 37, 48, 0.3)",
        },
        "border-hover": "var(--border-hover)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
        },
        "nhs-cyan": "var(--nhs-cyan)",
        success: {
          DEFAULT: "var(--success)",
        },
        warning: {
          DEFAULT: "var(--warning)",
        },
        error: {
          DEFAULT: "var(--error)",
        },
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "text-disabled": "var(--text-disabled)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Source Sans 3", "system-ui", "sans-serif"],
      },
      animation: {
        "route-pulse": "routePulse 2s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
      },
      keyframes: {
        routePulse: {
          "0%, 100%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(100%)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;