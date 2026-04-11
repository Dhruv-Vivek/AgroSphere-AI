/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agro: {
          green: '#16a34a',
          dark: '#14532d',
          light: '#dcfce7',
        }
      }
    },
  },
  plugins: [],
}