/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Courier New"', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        'bg-base':     '#0a0e1a',
        'bg-surface':  '#0f1629',
        'bg-elevated': '#1a2035',
        'bg-overlay':  '#1e2845',
        'border-subtle': '#1e2d4a',
        'accent':      '#4a9eff',
        'text-primary':   '#e8edf5',
        'text-secondary': '#8896b0',
        'text-muted':     '#4a5a78',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
