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
        bg: {
          primary: "#0A0A0B",
          secondary: "#121214",
          tertiary: "#1A1A1E",
        },
        accent: {
          DEFAULT: "#00D4AA",
          dark: "#00A88A",
          light: "#33DDBB",
        },
        surface: {
          DEFAULT: "rgba(255, 255, 255, 0.04)",
          hover: "rgba(255, 255, 255, 0.08)",
          glass: "rgba(255, 255, 255, 0.06)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 212, 170, 0.15)",
        "glow-strong": "0 0 30px rgba(0, 212, 170, 0.3)",
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
      },
      borderColor: {
        subtle: "rgba(255, 255, 255, 0.06)",
        DEFAULT: "rgba(255, 255, 255, 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
