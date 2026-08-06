import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import type { Result } from 'axe-core'
import { expect } from './fixtures'

type ColorContrastFinding = {
  /** The route this finding was recorded against, e.g. '/agenda'. */
  view: string
  /** The exact `node.target.join(', ')` axe reports for the offending element. */
  selector: string
  /** Why this is tolerated instead of fixed here — always points at the tracking issue. */
  reason: string
}

// `color-contrast` stays enabled (never `.disableRules('color-contrast')`,
// see runA11yScan below) so a *new* contrast regression still fails the
// spec. These are the specific, already-known node/view pairs contrast
// fixes belong to #75, not this issue — tracked explicitly instead of
// silenced so the rule keeps doing its job everywhere else. Each entry is
// checked against the live page on every run: a selector that stops
// matching (finding fixed) fails the spec too, so this list can't rot.
//
// ProfileMenu's avatar-fallback initials (`AvatarFallback`, PanelSidebar's
// footer) render `text-muted-foreground` on `bg-muted`: measured 4.34:1,
// axe requires 4.5:1 for this text size/weight. It's part of the persistent
// sidebar, so it shows up identically on every authenticated view. Tracked
// in #75 (design-token contrast pass), not fixed here per this issue's
// scope (no palette changes).
const AVATAR_FALLBACK_CONTRAST_REASON =
  'ProfileMenu avatar-fallback initials: text-muted-foreground on bg-muted measures 4.34:1 (needs 4.5:1) — tracked in #75, out of scope here'

const COLOR_CONTRAST_WHITELIST: ColorContrastFinding[] = [
  { view: '/', selector: '.bg-muted', reason: AVATAR_FALLBACK_CONTRAST_REASON },
  { view: '/agenda', selector: '.bg-muted', reason: AVATAR_FALLBACK_CONTRAST_REASON },
  {
    view: '/agenda#nuevo-turno',
    selector: '.bg-muted',
    reason: AVATAR_FALLBACK_CONTRAST_REASON,
  },
  { view: '/pacientes', selector: '.bg-muted', reason: AVATAR_FALLBACK_CONTRAST_REASON },
  { view: '/profesionales', selector: '.bg-muted', reason: AVATAR_FALLBACK_CONTRAST_REASON },
  { view: '/disponibilidad', selector: '.bg-muted', reason: AVATAR_FALLBACK_CONTRAST_REASON },
  { view: '/ajustes', selector: '.bg-muted', reason: AVATAR_FALLBACK_CONTRAST_REASON },
]

function formatViolations(violations: Result[]) {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => `  - ${node.target.join(', ')}\n    ${node.failureSummary ?? ''}`)
        .join('\n')
      return `${violation.id}: ${violation.help} (${violation.helpUrl})\n${nodes}`
    })
    .join('\n\n')
}

/**
 * Runs an axe-core scan of the current page and fails on any violation that
 * isn't an explicitly whitelisted, already-known `color-contrast` finding
 * for this exact `view`. Also fails if a whitelisted entry for this view no
 * longer matches anything — a stale whitelist is how this kind of rot
 * starts.
 */
export async function runA11yScan(page: Page, view: string): Promise<void> {
  // Both real CI and this containerized profile run the panel via `vite
  // dev` (see compose.yaml's comment on the `e2e` service), which mounts
  // `<TanStackRouterDevtools>` — gated behind `import.meta.env.DEV`
  // (routes/__root.tsx) and never present in a production build. It renders
  // its own `<footer>`, which axe's page-level landmark rules (duplicate
  // contentinfo, in particular) evaluate against the whole `document`
  // regardless of `AxeBuilder#exclude()`'s analysis scope — `.exclude()`
  // was tried first and confirmed not to suppress it. Removing the node
  // outright before scanning is what a production build already does by
  // never rendering it in the first place.
  await page.evaluate(() => {
    document.querySelector('.TanStackRouterDevtools')?.remove()
  })

  const results = await new AxeBuilder({ page }).analyze()

  const relevantWhitelist = COLOR_CONTRAST_WHITELIST.filter((entry) => entry.view === view)
  const matchedSelectors = new Set<string>()

  const unexpectedViolations = results.violations
    .map((violation) => {
      if (violation.id !== 'color-contrast') {
        return violation
      }

      const unexpectedNodes = violation.nodes.filter((node) => {
        const selector = node.target.join(', ')
        const whitelisted = relevantWhitelist.find((entry) => entry.selector === selector)
        if (!whitelisted) {
          return true
        }
        matchedSelectors.add(whitelisted.selector)
        return false
      })

      return unexpectedNodes.length > 0 ? { ...violation, nodes: unexpectedNodes } : null
    })
    .filter((violation): violation is NonNullable<typeof violation> => violation !== null)

  expect(unexpectedViolations, formatViolations(unexpectedViolations)).toEqual([])

  const staleEntries = relevantWhitelist.filter((entry) => !matchedSelectors.has(entry.selector))
  expect(
    staleEntries,
    `Stale color-contrast whitelist entries for ${view} (no longer reproduce — remove them from e2e/a11y.ts):\n${staleEntries
      .map((entry) => `${entry.selector}: ${entry.reason}`)
      .join('\n')}`,
  ).toEqual([])
}
