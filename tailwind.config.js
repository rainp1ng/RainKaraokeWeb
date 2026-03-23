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
          DEFAULT: '#FF6B35',
          dark: '#E55A2B',
          light: '#FF8C5A',
        },
        secondary: {
          DEFAULT: '#4ECDC4',
          dark: '#3CB8B0',
          light: '#6EDED7',
        },
        background: {
          DEFAULT: '#1A1A2E',
          dark: '#0F0F1A',
        },
        surface: {
          DEFAULT: '#252542',
          variant: '#2D2D4A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
