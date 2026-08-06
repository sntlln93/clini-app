import { expect, test } from './fixtures'
import { STORAGE_STATE } from './storage-state'

test.use({ storageState: STORAGE_STATE })

test('panel home renders for an authenticated user', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await expect(page).not.toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Agenda', level: 1 })).toBeVisible()
})

test('/agenda renders for an authenticated user', async ({ page }) => {
  await page.goto('/agenda')
  await page.waitForLoadState('networkidle')

  await expect(page).not.toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Agenda', level: 1 })).toBeVisible()
})

test('/pacientes renders for an authenticated user', async ({ page }) => {
  await page.goto('/pacientes')
  await page.waitForLoadState('networkidle')

  await expect(page).not.toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Pacientes', level: 1 })).toBeVisible()
})

test('/profesionales renders for an authenticated user', async ({ page }) => {
  await page.goto('/profesionales')
  await page.waitForLoadState('networkidle')

  await expect(page).not.toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Profesionales', level: 1 })).toBeVisible()
})

test('/disponibilidad renders for an authenticated user', async ({ page }) => {
  await page.goto('/disponibilidad')
  await page.waitForLoadState('networkidle')

  await expect(page).not.toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Disponibilidad', level: 1 })).toBeVisible()
})

test('/ajustes renders for an authenticated user', async ({ page }) => {
  await page.goto('/ajustes')
  await page.waitForLoadState('networkidle')

  await expect(page).not.toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Ajustes', level: 1 })).toBeVisible()
})
