import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#eef5f7",
        surface: "#fcfffd",
        ink: "#102327",
        line: "#c8d8d6",
        brand: {
          50: "#eef8f8",
          100: "#d7eceb",
          300: "#88c3c0",
          500: "#2f8f88",
          700: "#1f5f63",
          900: "#12363e"
        },
        sage: "#6ba292",
        sky: "#d9eef6",
        rose: "#f28b66"
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-display)", "ui-serif", "Georgia"]
      },
      boxShadow: {
        soft: "0 18px 50px rgba(59, 42, 24, 0.08)",
        card: "0 8px 30px rgba(59, 42, 24, 0.08)"
      },
      backgroundImage: {
        halo:
          "radial-gradient(circle at top left, rgba(170,127,77,0.2), transparent 35%), radial-gradient(circle at 85% 15%, rgba(111,139,121,0.18), transparent 28%), linear-gradient(180deg, rgba(255,253,248,1), rgba(247,244,236,1))"
      }
    }
  },
  plugins: []
};

export default config;
