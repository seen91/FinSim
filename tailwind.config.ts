import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';
import forms from '@tailwindcss/forms';

export default {
  content: ['./src/**/*.{html,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#dfedff',
          200: '#c6deff',
          300: '#a1c6fe',
          400: '#73a5fc',
          500: '#4c83f9',
          600: '#3162ef',
          700: '#2651da',
          800: '#2442b0',
          900: '#243c8a',
        },
        success: {
          50: '#eefdf2',
          100: '#d8fbe0',
          200: '#b4f5c6',
          300: '#83e9a4',
          400: '#4fd57a',
          500: '#2eb55e',
          600: '#1f924a',
          700: '#1c743f',
          800: '#1b5c34',
          900: '#174c2d',
        },
        danger: {
          50: '#fef2f2',
          100: '#ffe1e1',
          200: '#ffc9c9',
          300: '#fea3a3',
          400: '#fc7171',
          500: '#f53e3e',
          600: '#e12121',
          700: '#bd1717',
          800: '#9c1818',
          900: '#831b1b',
        },
        finance: {
          chart: '#34d399', // For positive financial indicators
          loss: '#ef4444',  // For negative financial indicators
          neutral: '#6b7280', // For neutral data points
        }
      },
      fontFamily: {
        sans: [
          '"Inter"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ],
        mono: [
          '"JetBrains Mono"',
          'Consolas',
          '"Courier New"',
          'monospace'
        ]
      },
      typography: (theme: (path: string) => string) => ({
        DEFAULT: {
          css: {
            color: theme('colors.gray.800'),
            h1: {
              color: theme('colors.primary.800'),
            },
            h2: {
              color: theme('colors.primary.700'),
            },
            h3: {
              color: theme('colors.primary.600'),
            },
            a: {
              color: theme('colors.primary.600'),
              '&:hover': {
                color: theme('colors.primary.800'),
              },
            },
          },
        },
      }),
      boxShadow: {
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [
    typography,
    forms
  ]
} satisfies Config;