/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        secondary: '#3B82F6',
        success: '#22C55E',
        danger: '#EF4444',
        warning: '#F59E0B',
        background: '#F8FAFC',
        darkbg: '#0F172A',
      },
    },
  },
  plugins: [],
};
