import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { resolve } from 'path'

export default defineConfig({
  plugins: [basicSsl()],
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
    https: true,
    port: 5173,
    strictPort: true,
  },
  appType: 'spa',
})
