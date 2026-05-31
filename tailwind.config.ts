import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        ink: {
          bg: "#0a0a0c",
          panel: "#121216",
          border: "#26262e",
          dim: "#6b6b78",
          text: "#d6d6dd",
          accent: "#8b6cff",
          warn: "#ff5c5c",
          spirit: "#4fd6c8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
