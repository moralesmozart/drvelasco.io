/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], serif: ['"Cormorant Garamond"', 'Georgia', 'serif'] },
      colors: {
        // Clinical green (buttons, focus, accents)
        brand: {
          50: '#eef8f4', 100: '#d5efe5', 200: '#ade0cc', 300: '#7ccaae', 400: '#4fae8f',
          500: '#2f9274', 600: '#25775f', 700: '#1f604e', 800: '#1c4d40', 900: '#183f35',
        },
        // Deep care green for hero surfaces
        care: {
          50: '#f2f8f6', 100: '#d9efe7', 200: '#b5ddd0', 300: '#86c4b1', 400: '#5aa892',
          500: '#3f8c77', 600: '#337563', 700: '#2c6a5a', 800: '#24564a', 900: '#1d463d',
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
