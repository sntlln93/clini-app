import { defineConfig, devices } from '@playwright/test';

// Local runs hit the already-running dev stack (api via Sail on :8080, panel
// on :5174, dashboard on :5175, landing on :5176). CI boots all four itself
// via `webServer`.
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
        { name: 'setup', testMatch: /.*\.setup\.ts$/ },
        {
            name: 'chromium',
            testIgnore: /(dashboard|landing)\//,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        // The platform dashboard: its own origin and its own operator
        // identity, so no dependency on the panel's `setup` session — each
        // spec logs in by itself.
        {
            name: 'dashboard',
            testMatch: /dashboard\/.*\.spec\.ts$/,
            use: {
                ...devices['Desktop Chrome'],
                baseURL:
                    process.env.E2E_DASHBOARD_URL ?? 'http://localhost:5175',
            },
        },
        // The public landing (server-rendered, no API calls, no session).
        {
            name: 'landing',
            testMatch: /landing\/.*\.spec\.ts$/,
            use: {
                ...devices['Desktop Chrome'],
                baseURL: process.env.E2E_LANDING_URL ?? 'http://localhost:5176',
            },
        },
    ],
    webServer: process.env.CI
        ? [
              {
                  // `--no-reload` is not a performance tweak: it is what makes the
                  // served app honour the environment it was started with. Without
                  // it, ServeCommand only forwards a hardcoded allowlist (APP_ENV,
                  // PATH, XDEBUG_*, …) to the `php -S` child it spawns and unsets
                  // every other variable it finds in `$_ENV`, so the app re-reads
                  // them from apps/api/.env — ignoring anything the caller exported.
                  // That is invisible on a GitHub runner (php.ini-production leaves
                  // `variables_order = GPCS`, so `$_ENV` is empty and there is
                  // nothing to unset) and fatal in the `e2e` compose service, whose
                  // Sail-based image ships `variables_order = EGPCS` and whose
                  // DB_HOST/DB_DATABASE overrides therefore never reached the
                  // server: it fell back to the dev stack's `pgsql`/`laravel` and
                  // 500'd on every DB-touching request. With the flag, the child
                  // inherits the environment as-is in both places.
                  command:
                      'php artisan serve --no-reload --host=127.0.0.1 --port=8080',
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
              {
                  command: 'npm run dev -- --host 127.0.0.1 --port 5175',
                  cwd: 'apps/dashboard',
                  url: 'http://127.0.0.1:5175',
                  timeout: 60_000,
              },
              {
                  command: 'npm run dev -- --host 127.0.0.1 --port 5176',
                  cwd: 'apps/landing',
                  url: 'http://127.0.0.1:5176',
                  timeout: 60_000,
              },
          ]
        : undefined,
});
