/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light industrial surface palette
        surface: {
          50:  '#f8fafc',   // page background
          100: '#f1f5f9',   // subtle section bg
          200: '#e2e8f0',   // borders
          300: '#cbd5e1',   // stronger borders
          400: '#94a3b8',   // muted text
          500: '#64748b',   // secondary text
          600: '#475569',   // body text
          700: '#334155',   // dark text
          800: '#1e293b',   // headings
          900: '#0f172a',   // nav text
        },
        // Primary accent — petroleum blue (kept)
        primary: {
          900: '#001a3a',
          800: '#002d63',
          700: '#003f8a',
          600: '#0051b0',
          500: '#0066cc',
          400: '#1a7fd4',
          300: '#4d9edd',
          200: '#80bde7',
          100: '#dbeafe',
          50:  '#eff6ff',
        },
        // Teal accent
        teal: {
          600: '#0d9488',
          500: '#14b8a6',
          100: '#ccfbf1',
          50:  '#f0fdfa',
        },
        // Status colors — light-friendly backgrounds
        status: {
          // Normal / OK (green)
          normal:     '#16a34a',
          normalBg:   '#f0fdf4',
          normalBorder: '#bbf7d0',
          // Warning (amber)
          warning:    '#d97706',
          warningBg:  '#fffbeb',
          warningBorder: '#fde68a',
          // High risk (orange)
          high:       '#ea580c',
          highBg:     '#fff7ed',
          highBorder: '#fed7aa',
          // Critical (red)
          critical:   '#dc2626',
          criticalBg: '#fef2f2',
          criticalBorder: '#fecaca',
          // Info (blue)
          info:       '#2563eb',
          infoBg:     '#eff6ff',
          infoBorder: '#bfdbfe',
        },
        // Formation colors (kept for charts)
        formation: {
          alluvium: '#94a3b8',
          tipam:    '#d97706',
          girujan:  '#7c3aed',
          barail:   '#16a34a',
          kopili:   '#dc2626',
          sylhet:   '#2563eb',
          jaintia:  '#7c3aed',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md': '0 4px 12px rgba(0,0,0,0.08)',
        'card-lg': '0 8px 24px rgba(0,0,0,0.10)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1.2s step-end infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
