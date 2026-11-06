/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50: '#effaf8', 100: '#d7f0eb', 200: '#b2e0d8', 300: '#8bbcb4', 400: '#5aa59a',
          500: '#3d8a7f', 600: '#2f6f66', 700: '#285a53', 800: '#234943', 900: '#1f3d39',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.06), 0 1px 3px rgb(15 23 42 / 0.04)',
        lift: '0 12px 28px -8px rgb(15 23 42 / 0.25), 0 4px 10px -4px rgb(15 23 42 / 0.12)',
      },
    },
  },
  plugins: [],
}
