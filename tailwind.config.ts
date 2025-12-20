import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cores da marca Cashly
        primary: {
          DEFAULT: '#00C853',
          50: '#E8FFF0',
          100: '#C6FFD9',
          200: '#8FFFB3',
          300: '#52FF8C',
          400: '#1AFF66',
          500: '#00C853',
          600: '#00A040',
          700: '#00782F',
          800: '#00501F',
          900: '#002810',
        },
        secondary: {
          DEFAULT: '#2962FF',
          50: '#E8EEFF',
          100: '#C6D6FF',
          200: '#8FADFF',
          300: '#5285FF',
          400: '#2962FF',
          500: '#0039CB',
          600: '#002DA3',
          700: '#00227A',
          800: '#001652',
          900: '#000B29',
        },
        background: '#F5F7FA',
        card: '#FFFFFF',
        success: '#00C853',
        error: '#FF5252',
        warning: '#FFB300',
        'text-primary': '#1A1A2E',
        'text-secondary': '#6B7280',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #00C853 0%, #1DE9B6 100%)',
        'secondary-gradient': 'linear-gradient(135deg, #2962FF 0%, #448AFF 100%)',
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
      fontSize: {
        'body': ['16px', { lineHeight: '24px' }],
        'heading': ['24px', { lineHeight: '32px', fontWeight: '700' }],
      },
      minHeight: {
        'touch': '56px',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
