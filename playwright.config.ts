import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 60000,
  use: {
    headless: true,
    ignoreHTTPSErrors: true,
    baseURL: 'https://localhost:5173',
  },
  projects: [
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'https://localhost:5173',
    reuseExistingServer: true,
    ignoreHTTPSErrors: true,
    timeout: 15000,
  },
})
