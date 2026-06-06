/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fcf6fb',
          100: '#f6ebf5',
          200: '#edd8eb',
          500: '#714B67', // Odoo purple
          600: '#5c3d54',
          700: '#472f41',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          500: '#0f172a',
        }
      }
    },
  },
  plugins: [],
}
