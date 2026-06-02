/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        suiteNavy: '#0f1f33',
        suiteCyan: '#36c9dd',
        suiteOrange: '#ff8a3d',
        suiteSand: '#f5efe3',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Sora', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}