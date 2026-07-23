/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontSize: {
        xxs: ['0.625rem', { lineHeight: '0.75rem' }], // 10px
        s: ['0.6875rem', { lineHeight: '0.875rem' }],  // 11px
        '7px': ['0.4375rem', { lineHeight: '0.625rem' }], // 7px
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
