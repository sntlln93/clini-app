import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

// Every case below hits the same anonymous session probe as
// `smoke.spec.ts`'s unauthenticated-visitor test: the network-level 401 and
// Chromium's own resource-load log for it are both expected noise, not
// evidence of a bug — see that spec for the full explanation.
const ANONYMOUS_SESSION_PROBE_ISSUES = {
  responses: [{ url: /\/api\/v1\/me$/, status: 401 }],
  console: [/Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/],
}

// The `reducedMotion` browser-context option (`test.use({ reducedMotion })`)
// only takes effect on this Playwright/Chromium combination if applied via
// an explicit `page.emulateMedia()` call after the page has loaded — set at
// context-creation time it is silently ignored (verified with a bare
// `matchMedia('(prefers-reduced-motion: reduce)')` probe on both a data: URL
// and the real /login page: `false` via the context option, `true` via
// `emulateMedia`). So every case below emulates explicitly instead of
// relying on `test.use`.

async function readTransitionDurations(page: Page) {
  const button = page.getByRole('button', { name: 'Ingresar' })
  await expect(button).toBeVisible()

  const raw = await button.evaluate((element) => getComputedStyle(element).transitionDuration)

  return raw.split(',').map((value) => parseFloat(value.trim()))
}

async function readSpinProbe(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement('div')
    probe.className = 'animate-spin'
    document.body.appendChild(probe)
    const style = getComputedStyle(probe)

    return {
      animationDuration: parseFloat(style.animationDuration),
      animationIterationCount: style.animationIterationCount,
    }
  })
}

test.describe('prefers-reduced-motion: reduce', () => {
  test.use({ expectedIssues: ANONYMOUS_SESSION_PROBE_ISSUES })

  test('collapses transitions on the login view', async ({ page }) => {
    await page.goto('/login')
    await page.emulateMedia({ reducedMotion: 'reduce' })

    const durations = await readTransitionDurations(page)

    for (const duration of durations) {
      expect(duration).toBeLessThan(0.001)
    }
  })

  test('collapses an infinite animation to a single iteration', async ({ page }) => {
    await page.goto('/login')
    await page.emulateMedia({ reducedMotion: 'reduce' })

    const probe = await readSpinProbe(page)

    expect(probe.animationDuration).toBeLessThan(0.001)
    expect(probe.animationIterationCount).toBe('1')
  })
})

test.describe('prefers-reduced-motion: no-preference', () => {
  test.use({ expectedIssues: ANONYMOUS_SESSION_PROBE_ISSUES })

  test('keeps transitions when no preference is set', async ({ page }) => {
    await page.goto('/login')
    await page.emulateMedia({ reducedMotion: 'no-preference' })

    const durations = await readTransitionDurations(page)

    expect(durations.some((duration) => duration > 0)).toBe(true)
  })

  test('keeps the infinite animation when no preference is set', async ({ page }) => {
    await page.goto('/login')
    await page.emulateMedia({ reducedMotion: 'no-preference' })

    const probe = await readSpinProbe(page)

    expect(probe.animationDuration).toBeGreaterThan(0)
    expect(probe.animationIterationCount).toBe('infinite')
  })
})
