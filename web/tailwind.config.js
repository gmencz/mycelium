const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
      screens: {
        xs: "480px",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
