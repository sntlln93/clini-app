import { expect, test } from '@playwright/test'

test('panel loads and reaches the api', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('conectado a api')).toBeVisible()
})

test('api responds to /api/ping', async ({ request }) => {
  const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:8080'
  const response = await request.get(`${apiUrl}/api/ping`)

  expect(response.ok()).toBeTruthy()
  expect(await response.json()).toEqual({ status: 'ok' })
})
