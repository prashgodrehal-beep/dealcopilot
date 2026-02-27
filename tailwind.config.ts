import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // DealPilot brand palette — deep navy cockpit with amber accents
        brand: {
          50: '#fef7ec',
          100: '#fdecd3',
          200: '#fad5a5',
          300: '#f6b86d',
          400: '#f29333',
          500: '#ef7b13',  // Primary amber accent
          600: '#d05e09',
          700: '#ad430b',
          800: '#8c3510',
          900: '#742d10',
        },
        navy: {
          50: '#f0f1f8',
          100: '#d9dbed',
          200: '#b3b7db',
          300: '#8d93c9',
          400: '#676fb7',
          500: '#4a529e',
          600: '#3a4180',
          700: '#2d3366',
          800: '#1a1f3d',
          900: '#0d1020',  // Deep background
          950: '#070812',  // Deepest
        },
        surface: {
          DEFAULT: '#111427',
          light: '#181c35',
          lighter: '#1f2442',
          border: '#2a2f52',
          hover: '#252a4a',
        }
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        display: ['var(--font-cabinet)', 'var(--font-outfit)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
