import { defineConfig } from 'vite'
import { resolve } from 'path'
import { readFileSync } from 'fs'

export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@input': resolve(__dirname, 'src/input'),
      '@modular': resolve(__dirname, 'src/modular'),
      '@visualizers': resolve(__dirname, 'src/visualizers'),
      '@scene': resolve(__dirname, 'src/scene'),
      '@postfx': resolve(__dirname, 'src/postfx'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@state': resolve(__dirname, 'src/state'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
  server: {
    https: {
      cert: readFileSync(resolve(__dirname, 'certs/localhost+1.pem')),
      key: readFileSync(resolve(__dirname, 'certs/localhost+1-key.pem')),
    },
    port: 5173,
    strictPort: true,
  },
  appType: 'spa',
})
