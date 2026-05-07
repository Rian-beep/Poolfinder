import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        surface: '#111111',
        border: '#1F1F1F',
        'border-subtle': '#161616',
        text: '#FFFFFF',
        muted: '#6B7280',
        'muted-dark': '#374151',
        accent: '#3B82F6',
        'accent-green': '#10B981',
        'accent-cyan': '#06B6D4',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
