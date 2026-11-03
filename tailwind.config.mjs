/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: 'rgb(var(--c-bg) / <alpha-value>)',
          raised: 'rgb(var(--c-raised) / <alpha-value>)',
          raised2: 'rgb(var(--c-raised2) / <alpha-value>)',
          sunken: 'rgb(var(--c-sunken) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--c-line) / <alpha-value>)',
          soft: 'rgb(var(--c-line-soft) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--c-ink) / <alpha-value>)',
          dim: 'rgb(var(--c-ink-dim) / <alpha-value>)',
          faint: 'rgb(var(--c-ink-faint) / <alpha-value>)',
        },
        purple: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          deep: 'rgb(var(--c-accent-deep) / <alpha-value>)',
          soft: 'rgb(var(--c-accent) / 0.16)',
        },
        violet: 'rgb(var(--c-violet) / <alpha-value>)',
        lavender: 'rgb(var(--c-lavender) / <alpha-value>)',
        emerald: {
          fin: 'rgb(var(--c-pos) / <alpha-value>)',
          deep: 'rgb(var(--c-pos-deep) / <alpha-value>)',
        },
        rose: {
          fin: 'rgb(var(--c-neg) / <alpha-value>)',
          deep: 'rgb(var(--c-neg-deep) / <alpha-value>)',
        },
        indigo: {
          fin: 'rgb(var(--c-indigo) / <alpha-value>)',
        },
        gold: 'rgb(var(--c-gold) / <alpha-value>)',
        orange: {
          fin: 'rgb(var(--c-orange) / <alpha-value>)',
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
