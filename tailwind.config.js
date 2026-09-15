/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './app/**/*.{js,ts,jsx,tsx,mdx}',
      './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          // Lunara Brand Colors
          'lunara-dark': '#0a0a0f',
          'lunara-darker': '#050508',
          'lunara-purple': '#6b46c1',
          'lunara-purple-light': '#9f7aea',
          'lunara-gold': '#d4af37',
          'lunara-gold-light': '#f6e05e',
          'lunara-mystic': '#4c1d95',
          
          // Status Colors
          'status-healthy': '#10b981',
          'status-degraded': '#f59e0b',
          'status-error': '#ef4444',
          'status-offline': '#6b7280',
          'status-working': '#3b82f6',
          'status-waiting': '#8b5cf6',
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          mono: ['JetBrains Mono', 'monospace'],
        },
        animation: {
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'glow': 'glow 2s ease-in-out infinite alternate',
        },
        keyframes: {
          glow: {
            '0%': { boxShadow: '0 0 5px rgba(107, 70, 193, 0.5)' },
            '100%': { boxShadow: '0 0 20px rgba(107, 70, 193, 0.8)' },
          },
        },
      },
    },
    plugins: [],
  }