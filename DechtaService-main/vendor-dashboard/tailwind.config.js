/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        brandYellow: '#0ceded',
        brandDark:   '#0F172A',
        brandGray:   '#1E293B',
      },
      boxShadow: { glow: '0 0 20px rgba(12,237,237,0.3)' },
    },
  },
  plugins: [],
};
