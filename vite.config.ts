import { defineConfig } from 'vite'
import { resolve } from 'path'

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
    // HTTP for dev — localhost is a "secure context" in all browsers,
    // so Web Audio API, getUserMedia, getDisplayMedia, and Spotify SDK all work.
    // Spotify requires http:// redirect URI for localhost.
    port: 5173,
    strictPort: true,
  },
  appType: 'spa',
})
