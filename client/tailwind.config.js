export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "rgb(56 189 248 / <alpha-value>)",
        brandStrong: "rgb(14 165 233 / <alpha-value>)",
        positive: "rgb(16 185 129 / <alpha-value>)",
        negative: "rgb(251 113 133 / <alpha-value>)"
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body: ["Manrope", "sans-serif"]
      },
      boxShadow: {
        soft: "0 24px 48px -28px rgba(0, 0, 0, 0.75)",
        glow: "0 24px 48px -28px rgba(56, 189, 248, 0.65)"
      }
    }
  },
  plugins: []
};
