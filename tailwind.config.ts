import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        field: "#f7f5ef",
        moss: "#55745f",
        clay: "#a45f45",
        skyline: "#376f8f",
        lemon: "#e9c46a"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(31, 41, 51, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
