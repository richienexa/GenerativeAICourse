import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Superficies — jerarquía de capas
        surface:                    '#f9f9fb',
        'surface-bright':           '#f9f9fb',
        'surface-dim':              '#d3dbe2',
        'surface-container-lowest': '#ffffff',
        'surface-container-low':    '#f2f4f6',
        'surface-container':        '#ebeef2',
        'surface-container-high':   '#e4e9ee',
        'surface-container-highest':'#dde3e9',
        'surface-variant':          '#dde3e9',
        'surface-tint':             '#005bbf',

        // Primario
        primary:                '#005bbf',
        'primary-dim':          '#0050a8',
        'primary-fixed':        '#d7e2ff',
        'primary-fixed-dim':    '#c2d4ff',
        'primary-container':    '#d7e2ff',
        'on-primary':           '#f7f7ff',
        'on-primary-fixed':     '#003d84',
        'on-primary-fixed-variant': '#0058b9',
        'on-primary-container': '#004fa7',
        'inverse-primary':      '#498eff',

        // Secundario
        secondary:              '#56606e',
        'secondary-dim':        '#4a5462',
        'secondary-fixed':      '#d9e3f4',
        'secondary-fixed-dim':  '#cbd5e6',
        'secondary-container':  '#d9e3f4',
        'on-secondary':         '#f7f9ff',
        'on-secondary-fixed':   '#36404d',
        'on-secondary-fixed-variant': '#525c6a',
        'on-secondary-container': '#485260',

        // Terciario (éxito / Listo)
        tertiary:               '#006d4a',
        'tertiary-dim':         '#005f40',
        'tertiary-fixed':       '#69f6b8',
        'tertiary-fixed-dim':   '#58e7ab',
        'tertiary-container':   '#69f6b8',
        'on-tertiary':          '#e6ffee',
        'on-tertiary-fixed':    '#00452d',
        'on-tertiary-fixed-variant': '#006544',
        'on-tertiary-container': '#005a3c',

        // Error / Bloqueado
        error:                  '#9f403d',
        'error-dim':            '#4e0309',
        'error-container':      '#fe8983',
        'on-error':             '#fff7f6',
        'on-error-container':   '#752121',

        // Texto y contornos
        background:             '#f9f9fb',
        'on-background':        '#2d3338',
        'on-surface':           '#2d3338',
        'on-surface-variant':   '#596065',
        outline:                '#757c81',
        'outline-variant':      '#acb3b8',
        'inverse-surface':      '#0c0e10',
        'inverse-on-surface':   '#9c9d9f',
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
