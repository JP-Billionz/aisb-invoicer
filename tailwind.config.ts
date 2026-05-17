import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: "#7C3AED",
          "purple-deep": "#5620AF",
          green: "#39D353",
        },
        ink: {
          900: "#0B0B12",
          800: "#13131C",
          700: "#1C1C28",
          600: "#262636",
          500: "#3A3A4E",
          400: "#6B6B82",
          300: "#9A9AB0",
          200: "#C9C9D6",
          100: "#E8E8EF",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
