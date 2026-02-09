import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Remove allowHosts in production
  server: {
    allowedHosts: true
  }
})