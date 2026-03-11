export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "rgb(34 211 238 / <alpha-value>)",
        brandStrong: "rgb(14 165 233 / <alpha-value>)",
        brandHot: "rgb(59 130 246 / <alpha-value>)",
        positive: "rgb(45 212 191 / <alpha-value>)",
        negative: "rgb(251 113 133 / <alpha-value>)"
      },
      fontFamily: {
        display: ["Poppins", "Inter", "sans-serif"],
        body: ["Inter", "sans-serif"]
      },
      boxShadow: {
        soft: "0 24px 48px -28px rgba(2, 6, 23, 0.9)",
        glow: "0 20px 44px -24px rgba(6, 182, 212, 0.82)"
      }
    }
  },
  plugins: []
};
