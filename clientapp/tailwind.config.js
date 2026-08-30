/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#E8FBF6",
          100: "#C7F5E9",
          200: "#93ECD6",
          300: "#5EE0C2",
          400: "#2FD0AC",
          500: "#10B5A6",
          600: "#0E9C90",
          700: "#0B7E75",
          800: "#0A645D",
          900: "#084F4A",
          950: "#062F2D",
        },
        // Electric blue — a distinct secondary next to the teal/cyan brand,
        // replacing an earlier violet accent that didn't match the
        // enterprise SOC "cyan/blue" palette.
        accent: {
          300: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
          700: "#0369A1",
        },
      },
      boxShadow: {
        glow: "0 0 50px rgba(16, 181, 166, 0.22)",
        panel: "0 24px 80px rgba(15, 23, 42, 0.12)",
      },
      backgroundImage: {
        "cyber-grid": "linear-gradient(rgba(16,181,166,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(16,181,166,0.08) 1px, transparent 1px)",
      },
      backgroundSize: {
        "cyber-grid": "32px 32px",
      },
    },
  },
  plugins: [],
};
