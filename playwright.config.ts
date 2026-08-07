import { defineConfig, devices } from '@playwright/test';

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
        { name: 'setup', testMatch: /.*\.setup\.ts$/ },
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
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
          ]
        : undefined,
});
