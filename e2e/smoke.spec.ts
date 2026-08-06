import { expect, test } from './fixtures'

test.describe('panel redirects an unauthenticated visitor to login', () => {
  test.use({
    expectedIssues: {
      // The session probe still gets a 401 at the network level for an
      // anonymous visitor — only the console logging of it is suppressed
      // (query-client's `onError` skips it for the session query's expected
      // 401, see `apps/panel/src/lib/query-client.ts`).
      responses: [{ url: /\/api\/v1\/me$/, status: 401 }],
      // Chromium itself still logs the failed 401 resource load at the
      // browser level — that is not emitted by app code (the app's own
      // "Query failed" log is the thing the fix above suppresses) and
      // cannot be removed from app code.
      console: [
        /Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/,
      ],
    },
  })

  test('panel redirects an unauthenticated visitor to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
  })
})

test('api responds to /api/v1/ping', async ({ request }) => {
  const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:8080'
  const response = await request.get(`${apiUrl}/api/v1/ping`)

  expect(response.ok()).toBeTruthy()
  expect(await response.json()).toEqual({ status: 'ok' })
})
