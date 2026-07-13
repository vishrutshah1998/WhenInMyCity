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
        'ds-coral-dim':   'rgba(232,112,90,0.15)',
        'ds-coral-glow':  'rgba(232,112,90,0.35)',
        'ds-teal':     '#5DD9D0',
        'ds-teal-light': '#A8F0EC',
        'ds-teal-dim':   'rgba(93,217,208,0.12)',
        'ds-amber':    '#F5A800',
        'ds-amber-light': '#FFD166',
        'ds-amber-dim':   'rgba(245,168,0,0.12)',
        'ds-gulaal':   '#E8342A',
        'ds-neel':     '#3B6BCC',
        'ds-neel-dim':   'rgba(59,107,204,0.15)',
        'ds-success':  '#4ADE80',

        // ── Vibrant marketing reskin (static) — cream/postal, marketing pages only.
        // Does NOT touch --wimc-* (live dashboard/explore/admin tokens) or ds-* (dark
        // Creator Studio tokens) — scoped to /, /growth, /mission, /hall-of-lights,
        // /map-of-legends. Values match .claude/skills/…/tokens/colors-vibrant.css.
        'vib-cream':       '#FBF3E7',
        'vib-cream-2':     '#F3E8D6',
        'vib-ink':         '#201A12',
        'vib-text-2':      '#58503F',
        'vib-text-3':      '#8A8070',
        'vib-sunset':      '#FF6B35',
        'vib-coral':       '#FF8F73',
        'vib-pink':        '#FFB5C0',
        'vib-sky':         '#4FB8E8',
        'vib-teal':        '#1F8A70',
        'vib-gold':        '#FFC53D',
        'vib-purple':      '#6B4EFF',
        'vib-postal-red':  '#D8432E',
        'vib-postal-blue': '#2C4A8C',

        // ── Editorial Light / Chalk-Ink reskin (static) — Explorer public surface
        // (/explore/*). Warm magazine palette per colors-editorial.css. Reuses
        // ds-coral/ds-coral-light/ds-teal/ds-amber(turmeric)/ds-gulaal/ds-neel(neel-light)
        // where values already match — only genuinely new tones get an ed- token.
        'ed-ink':      '#1A1108',
        'ed-chalk':    '#F7F2E8',
        'ed-chalk-2':  '#EDE7D6',
        'ed-chalk-3':  '#E0D9C8',
        'ed-neel':     '#1B3A6B',
        'ed-leaf':     '#2A6B4A',
        'ed-text-2':   '#4A3F2F',
        'ed-text-3':   '#7A6E5F',
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
        // Venue portal radius tokens
        'venue-card': '12px',
        'venue-sm':   '6px',
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
        // Venue portal — tabular numerals via font-venue-nums utility class
        'venue': ['Inter', 'system-ui', 'sans-serif'],
        'venue-mono': ["'JetBrains Mono'", "'Fira Code'", 'monospace'],
        // Vibrant marketing reskin — handwritten script accent + postal/stamp serif
        'vib-script': ['var(--font-caveat)', 'cursive'],
        'vib-stamp': ['var(--font-dm-serif)', 'serif'],
      },
      width: {
        'ds-sidebar':    '220px',
        'venue-sidebar':  '240px',
      },
      transitionDuration: {
        'ds': '220ms',
      },
    },
  },
  plugins: [
    // font-venue-nums: enables Inter's tabular figures for aligned revenue/metric columns
    plugin(({ addUtilities }) => {
      addUtilities({
        '.font-venue-nums': { 'font-variant-numeric': 'tabular-nums' },
      })
    }),
  ],
}

export default config
