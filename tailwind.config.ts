import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        
        surface: {
          primary: 'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
          elevated: 'var(--surface-elevated)',
          subtle: 'var(--surface-subtle)',
          border: 'var(--surface-border)',
        },

        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },

        earth: {
          50: '#fbfbfa',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },

        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },

        success: {
          DEFAULT: 'var(--success)',
          foreground: 'var(--success-foreground)',
          subtle: 'var(--success-subtle)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          foreground: 'var(--warning-foreground)',
          subtle: 'var(--warning-subtle)',
        },
        error: {
          DEFAULT: 'var(--error)',
          foreground: 'var(--error-foreground)',
          subtle: 'var(--error-subtle)',
        },
        info: {
          DEFAULT: 'var(--info)',
          foreground: 'var(--info-foreground)',
          subtle: 'var(--info-subtle)',
        },

        glass: {
          bg: 'var(--glass-background)',
          'bg-strong': 'var(--glass-background-strong)',
          border: 'var(--glass-border)',
          'border-subtle': 'var(--glass-border-subtle)',
          shadow: 'var(--glass-shadow)',
        }
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        pill: '9999px',
      },
      boxShadow: {
        subtle: 'var(--shadow-subtle)',
        card: 'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)',
        glass: 'var(--glass-shadow)',
        glow: '0 0 25px -5px rgba(16, 185, 129, 0.25)',
      },
      backdropBlur: {
        glass: 'var(--glass-blur)',
      },
      fontSize: {
        'display': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '800' }],
        'h1': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h2': ['2rem', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '700' }],
        'h3': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h4': ['1.25rem', { lineHeight: '1.35', letterSpacing: '-0.005em', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }],
        'label': ['0.8125rem', { lineHeight: '1.2', letterSpacing: '0.01em', fontWeight: '500' }],
        'overline': ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.08em', fontWeight: '600' }],
      }
    },
  },
  plugins: [],
};

export default config;
