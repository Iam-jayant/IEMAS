import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // IEMAS Industrial Color Palette
        primary: {
          DEFAULT: "#019CDF",
          hover: "#0180b8",
        },
        background: "#F8FAFC",
        card: "#FFFFFF",
        sidebar: "#111827",
        text: {
          primary: "#111827",
          secondary: "#6B7280",
        },
        border: "#E5E7EB",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        ai: "#7C3AED",
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
