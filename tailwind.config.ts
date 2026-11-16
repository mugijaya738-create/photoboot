import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palet Natal "clean": krim, hijau pinus, merah anggur, emas lembut
        cream: { 50: "#fdfaf3", 100: "#f9f2e3", 200: "#f1e6cf", 300: "#e6d6b4" },
        pine: { 50: "#eef3ef", 100: "#d5e2d8", 300: "#7fa28a", 500: "#3f6b52", 700: "#1f3d2e", 800: "#17301f", 900: "#0f2218", 950: "#0a1710" },
        berry: { 400: "#d4584f", 500: "#b83a35", 600: "#9c2d2b" },
        gold: { 300: "#e9cf94", 400: "#d9b76a", 500: "#c39a45" },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        script: ['"Great Vibes"', "cursive"],
      },
      keyframes: {
        pop: { "0%": { transform: "scale(.6)", opacity: "0" }, "40%": { transform: "scale(1.08)", opacity: "1" }, "100%": { transform: "scale(1)", opacity: "1" } },
        flash: { "0%": { opacity: ".95" }, "100%": { opacity: "0" } },
        snow: { "0%": { transform: "translateY(-10vh)" }, "100%": { transform: "translateY(110vh)" } },
      },
      animation: { pop: "pop .5s ease-out", flash: "flash .45s ease-out forwards", snow: "snow linear infinite" },
    },
  },
  plugins: [],
};
export default config;
