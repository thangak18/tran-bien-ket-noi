import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0084E8',
          hover: '#006EC4',
        },
        background: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        text: {
          main: 'var(--color-text)',
          sub: 'var(--color-text-muted)',
        },
        status: {
          gray: '#64748B', // slate-500
          blue: '#2563EB', // blue-600
          orange: '#EA580C', // orange-600
          green: '#15803D', // green-700
          yellow: '#D97706', // amber-600
          purple: '#7C3AED', // violet-600
          red: '#B91C1C', // red-700 (chỉ CB)
        },
      },
      borderRadius: {
        card: '12px',
        btn: '10px',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'sans-serif'],
      },
      height: {
        'btn-main': 'var(--btn-h)',
      },
      minHeight: {
        'btn-main': 'var(--btn-h)',
        tap: 'var(--tap)',
      },
      minWidth: {
        tap: 'var(--tap)',
      },
      fontSize: {
        'senior-body': 'var(--fs-body)',
        'senior-title': 'var(--fs-title)',
      },
    },
  },
  plugins: [],
};

export default config;
