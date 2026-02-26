import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // Remove allowHosts in production
  server: {
    port: 5993,
    host: true,
    allowedHosts: true,
  },
  // Load .env from workspace root (opense-stack)
  envDir: resolve(__dirname, '../..'),
  test: {
    globals: true,
    environment: 'jsdom',
    environmentMatchGlobs: [['src/api/**/*.{test,spec}.ts', 'node']],
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})