import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    browserName: 'firefox',
    headless: true,
    ignoreHTTPSErrors: true,
    baseURL: 'https://localhost:5173',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'https://localhost:5173',
    reuseExistingServer: true,
    ignoreHTTPSErrors: true,
    timeout: 15000,
  },
})
