export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "rgb(124 58 237 / <alpha-value>)",
        brandStrong: "rgb(56 189 248 / <alpha-value>)",
        brandHot: "rgb(236 72 153 / <alpha-value>)",
        positive: "rgb(52 211 153 / <alpha-value>)",
        negative: "rgb(251 113 133 / <alpha-value>)"
      },
      fontFamily: {
        display: ["Sora", "Outfit", "sans-serif"],
        body: ["Outfit", "sans-serif"]
      },
      boxShadow: {
        soft: "0 24px 56px -30px rgba(2, 6, 23, 0.92)",
        glow: "0 24px 56px -26px rgba(124, 58, 237, 0.82)",
        neon: "0 0 0 1px rgba(56, 189, 248, 0.35), 0 24px 40px -28px rgba(236, 72, 153, 0.68)"
      }
    }
  },
  plugins: []
};
