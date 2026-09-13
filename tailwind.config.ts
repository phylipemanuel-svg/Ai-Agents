import type { Config } from "tailwindcss";

// Flotek brand palette — from Flotek Group brand guidelines.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        plum: {
          lightest: "#f5edf8",
          lighter: "#c4aacf",
          light: "#ac83bb",
          DEFAULT: "#8a3b8e",
          dark: "#50295e",
          darker: "#3b1f45",
          darkest: "#28162e",
        },
        violet: {
          lightest: "#f6f4f6",
          lighter: "#ede8ed",
          light: "#b7a4b7",
          DEFAULT: "#947793",
          darker: "#704a70",
          darkest: "#4b1c4b",
        },
        orange: {
          lightest: "#fdf0e0",
          lighter: "#f8c08d",
          light: "#e69e63",
          DEFAULT: "#ee792c",
          dark: "#bd6025",
          darker: "#9d4716",
          darkest: "#60270a",
        },
        meadow: {
          lightest: "#e0f0e6",
          lighter: "#b2cfbb",
          light: "#99bfaa",
          DEFAULT: "#99bfaa",
          dark: "#648b78",
          darker: "#496559",
          darkest: "#314039",
        },
      },
    },
  },
  plugins: [],
};

export default config;
