import { expect, test } from '@playwright/test'

test('panel loads the layout shell', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/agenda$/)
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible()
})

test('api responds to /api/v1/ping', async ({ request }) => {
  const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:8080'
  const response = await request.get(`${apiUrl}/api/v1/ping`)

  expect(response.ok()).toBeTruthy()
  expect(await response.json()).toEqual({ status: 'ok' })
})
