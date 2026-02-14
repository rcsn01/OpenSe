import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5991,
    host: true,
    allowedHosts: true,
  },
  envDir: resolve(__dirname, '../..'),
})
