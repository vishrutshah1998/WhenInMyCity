import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Profile theme colors (CSS-var driven) ──────────────────────────
        primary:                   'rgb(var(--color-primary) / <alpha-value>)',
        'on-primary':              'rgb(var(--color-on-primary) / <alpha-value>)',
        'primary-container':       'rgb(var(--color-primary-container) / <alpha-value>)',
        'on-primary-container':    'rgb(var(--color-on-primary-container) / <alpha-value>)',
        background:                'rgb(var(--color-background) / <alpha-value>)',
        'on-background':           'rgb(var(--color-on-background) / <alpha-value>)',
        surface:                   'rgb(var(--color-surface) / <alpha-value>)',
        'on-surface':              'rgb(var(--color-on-surface) / <alpha-value>)',
        'on-surface-variant':      'rgb(var(--color-on-surface-variant) / <alpha-value>)',
        'surface-container-lowest':  'rgb(var(--color-surface-container-lowest) / <alpha-value>)',
        'surface-container-low':     'rgb(var(--color-surface-container-low) / <alpha-value>)',
        'surface-container':         'rgb(var(--color-surface-container) / <alpha-value>)',
        'surface-container-high':    'rgb(var(--color-surface-container-high) / <alpha-value>)',
        'surface-container-highest': 'rgb(var(--color-surface-container-highest) / <alpha-value>)',
        outline:                   'rgb(var(--color-outline) / <alpha-value>)',
        'outline-variant':         'rgb(var(--color-outline-variant) / <alpha-value>)',
        'surface-tint':            'rgb(var(--color-primary) / <alpha-value>)',
        secondary:                 '#ffb955',
        'on-secondary':            '#482f00',
        'secondary-container':     '#633f00',
        'on-secondary-container':  '#ffb955',
        'secondary-fixed':         '#ffb955',
        'on-secondary-fixed':      '#482f00',
        'on-secondary-fixed-variant': '#633f00',
        tertiary:                  '#70dba2',
        'tertiary-container':      '#008656',
        'on-tertiary':             '#ffffff',
        'on-tertiary-container':   '#f6fff6',
        'surface-variant':         '#4d4542',
        error:                     '#ffb4ab',
        'error-container':         '#93000a',
        'on-error':                '#ffffff',
        'on-error-container':      '#ffdad6',
        'inverse-surface':         '#f5ede4',
        'inverse-on-surface':      '#1e1b16',

        // ── Dashboard / prototype design system (static) ───────────────────
        'ds-base':     '#0A0A0B',
        'ds-raised':   '#131318',
        'ds-elevated': '#1C1C24',
        'ds-overlay':  '#242430',
        'ds-hover':    '#2E2E3C',
        'ds-text':     '#F0EFF8',
        'ds-text-2':   '#9896B0',
        'ds-text-3':   '#5C5A72',
        'ds-coral':       '#E8705A',
        'ds-coral-light': '#FFBBA6',
        'ds-teal':     '#5DD9D0',
        'ds-amber':    '#F5A800',
        'ds-gulaal':   '#E8342A',
        'ds-neel':     '#3B6BCC',
        'ds-success':  '#4ADE80',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
        full: '9999px',
        // Dashboard radius tokens
        'ds-sm': '6px',
        'ds-md': '12px',
        'ds-lg': '18px',
        'ds-xl': '24px',
        // Adda portal radius tokens
        'adda-card': '12px',
        'adda-sm':   '6px',
      },
      fontFamily: {
        // Profile themes
        headline: ['var(--font-jakarta)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        label: ['var(--font-inter)', 'sans-serif'],
        script: ['var(--font-dancing)', 'cursive'],
        // Dashboard design system
        display: ['var(--font-syne)', 'sans-serif'],
        sans: ['var(--font-dm-sans)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
        // Adda portal — tabular numerals via font-adda-nums utility class
        'adda': ['Inter', 'system-ui', 'sans-serif'],
        'adda-mono': ["'JetBrains Mono'", "'Fira Code'", 'monospace'],
      },
      width: {
        'ds-sidebar':    '220px',
        'adda-sidebar':  '240px',
      },
      transitionDuration: {
        'ds': '220ms',
      },
    },
  },
  plugins: [
    // font-adda-nums: enables Inter's tabular figures for aligned revenue/metric columns
    plugin(({ addUtilities }) => {
      addUtilities({
        '.font-adda-nums': { 'font-variant-numeric': 'tabular-nums' },
      })
    }),
  ],
}

export default config
