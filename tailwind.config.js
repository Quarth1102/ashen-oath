/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0d0b10',
        ash: { 900: '#141118', 800: '#1c1821', 700: '#27212d', 600: '#352d3c', 500: '#4a4052', 400: '#6b5f73' },
        bone: { DEFAULT: '#e8dfcf', dim: '#b5ab9b', faint: '#7d7468' },
        blood: { DEFAULT: '#a3202d', light: '#d13a48', dark: '#5e1219' },
        ember: { DEFAULT: '#e0a33a', light: '#f5c96a', dark: '#8a5a17' },
        spectral: { DEFAULT: '#5fd1c1', dark: '#2a6f68' },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        pixel: ['VT323', 'monospace'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        rune: '0 0 0 1px rgba(224,163,58,.25), 0 8px 30px -10px rgba(0,0,0,.8)',
        glow: '0 0 20px rgba(224,163,58,.45)',
      },
    },
  },
  plugins: [],
};
