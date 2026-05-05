import type { Config } from 'tailwindcss'

function v(name: string) {
  return `var(--color-${name})`
}

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface:                    v('surface'),
        'surface-bright':           v('surface-bright'),
        'surface-dim':              v('surface-dim'),
        'surface-container-lowest': v('surface-container-lowest'),
        'surface-container-low':    v('surface-container-low'),
        'surface-container':        v('surface-container'),
        'surface-container-high':   v('surface-container-high'),
        'surface-container-highest':v('surface-container-highest'),
        'surface-variant':          v('surface-variant'),
        'surface-tint':             v('primary'),

        primary:                v('primary'),
        'primary-dim':          v('primary-dim'),
        'primary-fixed':        v('primary-fixed'),
        'primary-fixed-dim':    v('primary-fixed-dim'),
        'primary-container':    v('primary-container'),
        'on-primary':           v('on-primary'),
        'on-primary-fixed':     v('on-primary-fixed'),
        'on-primary-fixed-variant': v('primary'),
        'on-primary-container': v('primary'),
        'inverse-primary':      v('inverse-primary'),

        secondary:              v('secondary'),
        'secondary-dim':        v('secondary'),
        'secondary-fixed':      v('secondary-container'),
        'secondary-fixed-dim':  v('secondary-container'),
        'secondary-container':  v('secondary-container'),
        'on-secondary':         v('on-secondary'),
        'on-secondary-fixed':   v('on-secondary-fixed'),
        'on-secondary-fixed-variant': v('secondary'),
        'on-secondary-container': v('secondary'),

        tertiary:               v('tertiary'),
        'tertiary-dim':         v('tertiary'),
        'tertiary-fixed':       v('tertiary-fixed'),
        'tertiary-fixed-dim':   v('tertiary-fixed'),
        'tertiary-container':   v('tertiary-container'),
        'on-tertiary':          v('on-tertiary'),
        'on-tertiary-fixed':    v('on-tertiary-fixed'),
        'on-tertiary-fixed-variant': v('tertiary'),
        'on-tertiary-container': v('tertiary'),

        error:                  v('error'),
        'error-dim':            v('error-dim'),
        'error-container':      v('error-container'),
        'on-error':             v('on-error'),
        'on-error-container':   v('on-error-container'),

        background:             v('background'),
        'on-background':        v('on-background'),
        'on-surface':           v('on-surface'),
        'on-surface-variant':   v('on-surface-variant'),
        outline:                v('outline'),
        'outline-variant':      v('outline-variant'),
        'inverse-surface':      v('inverse-surface'),
        'inverse-on-surface':   v('inverse-on-surface'),
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg:      '0.25rem',
        xl:      '0.5rem',
        full:    '0.75rem',
      },
      fontFamily: {
        headline: ['Inter', 'sans-serif'],
        body:     ['Inter', 'sans-serif'],
        label:    ['Inter', 'sans-serif'],
      },
      boxShadow: {
        ambient: '0px 12px 32px rgba(12, 14, 16, 0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config
