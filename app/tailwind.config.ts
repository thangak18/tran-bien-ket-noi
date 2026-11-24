import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF4FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          DEFAULT: '#2563EB', // Blue-600
          hover: '#1D4ED8', // Blue-700
          dark: '#1D4ED8',
          light: '#60A5FA',
        },
        background: '#F5F7FB',
        surface: '#FFFFFF',
        text: {
          main: '#111827', // Gray-900
          sub: '#6B7280', // Gray-500
        },
        status: {
          gray: '#6B7280',
          blue: '#2563EB',
          orange: '#EA580C',
          green: '#16A34A',
          yellow: '#D97706',
          purple: '#7C3AED',
          red: '#DC2626',
        },
      },
      borderRadius: {
        card: '12px',
        btn: '10px',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
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
