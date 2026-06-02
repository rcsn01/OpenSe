import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: mode === 'desktop' || mode === 'mobile' ? './' : '/',
  plugins: [react()],
  // Remove allowHosts in production
  server: {
    port: 5993,
    strictPort: true,
    host: true,
    allowedHosts: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    environmentMatchGlobs: [['src/api/**/*.{test,spec}.ts', 'node']],
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}))
