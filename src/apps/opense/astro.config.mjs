import { defineConfig } from 'astro/config'

export default defineConfig({
  output: 'static',
  devToolbar: {
    enabled: false,
  },
  prefetch: {
    defaultStrategy: 'hover',
    prefetchAll: false,
  },
  server: {
    host: '0.0.0.0',
    port: 5994,
  },
})
