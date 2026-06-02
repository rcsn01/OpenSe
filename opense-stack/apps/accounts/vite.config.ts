import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: mode === 'desktop' || mode === 'mobile' ? './' : '/',
  plugins: [react()],
  server: {
    port: 5991,
    strictPort: true,
    host: true,
    allowedHosts: true,
    cors: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}))
