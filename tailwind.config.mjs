/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0f0a1a',
          raised: '#1a1330',
          raised2: '#221a3d',
          sunken: '#0a0614',
        },
        line: {
          DEFAULT: '#332857',
          soft: '#251d40',
        },
        ink: {
          DEFAULT: '#f1edfb',
          dim: '#b6abd6',
          faint: '#8d7fb5',
        },
        purple: {
          DEFAULT: '#a78bfa',
          deep: '#8b5cf6',
          soft: 'rgba(167,139,250,0.16)',
        },
        violet: '#c084fc',
        lavender: '#ddd6fe',
        emerald: {
          fin: '#4ade80',
          deep: '#22c55e',
        },
        rose: {
          fin: '#fb7185',
          deep: '#e11d48',
        },
        indigo: {
          fin: '#818cf8',
        },
        gold: '#fbbf24',
        orange: {
          fin: '#fb923c',
        },
      },
      fontFamily: {
        display: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'DM Mono', 'monospace'],
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
};
