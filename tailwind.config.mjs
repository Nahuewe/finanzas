/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0e0b17',
          raised: '#17132a',
          raised2: '#1f1a38',
          sunken: '#090711',
        },
        line: {
          DEFAULT: '#2f2750',
          soft: '#221c3b',
        },
        ink: {
          DEFAULT: '#efeaff',
          dim: '#b9b0d9',
          faint: '#8b81b0',
        },
        purple: {
          DEFAULT: '#a78bfa',
          deep: '#7c5cf0',
          soft: 'rgba(167,139,250,0.16)',
        },
        violet: '#c4a1ff',
        lavender: '#e3dcff',
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
