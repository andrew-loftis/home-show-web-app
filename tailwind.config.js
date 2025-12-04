/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.js",
    "./*.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#007AFF",
        brand: "#0A84FF",
        dark: "#1C1C1E",
        "glass-surface": "rgba(255, 255, 255, 0.1)",
        "glass-border": "rgba(255, 255, 255, 0.15)"
      },
      backdropBlur: {
        xs: "2px"
      },
      animation: {
        "fade-in": "fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-up": "slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        "floating": "floating 3s ease-in-out infinite"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        floating: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        }
      }
    }
  },
  plugins: []
}
