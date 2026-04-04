/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#70AD47',
          'green-dark': '#5c9439',
          red: '#C00000',
          'red-dark': '#a00000',
        },
      },
      boxShadow: {
        'brand-soft': '0 12px 40px -12px rgba(112, 173, 71, 0.18)',
        'brand-red-soft': '0 8px 28px -8px rgba(192, 0, 0, 0.14)',
      },
    },
  },
  plugins: [],
}
