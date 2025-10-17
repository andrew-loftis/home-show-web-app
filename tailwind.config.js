/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#007AFF",
        dark: "#1C1C1E"
      }
    }
  },
  plugins: []
}
