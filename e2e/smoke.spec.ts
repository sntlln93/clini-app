import { expect, test } from './fixtures'

test.describe('panel redirects an unauthenticated visitor to login', () => {
  test.use({
    allowedResponses: [{ url: /\/api\/v1\/me$/, status: 401 }],
    // Expected console noise from the unauthenticated session check: the browser
    // logs the failed 401 resource load, and query-client's onError logs the
    // resulting failed query (once per guard that calls requireSession /
    // redirectIfAuthenticated).
    allowedConsoleMessages: [
      /Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/,
      /Query failed: UnauthorizedError: Unauthorized/,
    ],
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
