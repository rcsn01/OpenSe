import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: mode === 'desktop' || mode === 'mobile' ? './' : '/',
  plugins: [react()],
  server: {
    port: Number(process.env.OPEN_KB_DEV_PORT ?? 5995),
    strictPort: false,
    host: process.env.OPEN_KB_DEV_HOST ?? '127.0.0.1',
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
