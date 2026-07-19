import { defineConfig, devices } from '@playwright/test'

// Local runs hit the already-running dev stack (api via Sail on :8080, panel
// on :5174). CI boots both itself via `webServer`.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.CI
    ? [
        {
          command: 'php artisan serve --host=127.0.0.1 --port=8080',
          cwd: 'apps/api',
          url: 'http://127.0.0.1:8080/up',
          timeout: 60_000,
        },
        {
          command: 'npm run dev -- --host 127.0.0.1 --port 5174',
          cwd: 'apps/panel',
          url: 'http://127.0.0.1:5174',
          timeout: 60_000,
        },
      ]
    : undefined,
})
