/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'wsu-crimson': '#981e32',
        'wsu-gray': '#5e6a71'
      }
    },
  },
  plugins: [],
}
