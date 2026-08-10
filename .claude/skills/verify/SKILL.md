---
name: verify
description: Browser verification of UI changes using Playwright and the shared e2e helpers — throwaway specs in e2e/verify/, headed/debug runs, traces, and mobile viewport probes. Use when a UI change needs visual or behavioral confirmation in a real browser.
---

# Verify UI changes in the browser

## How the app is served locally

The panel is the `panel` service in `apps/panel/compose.yaml`, always running
`vite dev` — <http://localhost:5174> serves changes via HMR, no build needed.
The API is `laravel.test` on <http://localhost:8080>, from `apps/api/compose.yaml`.
Both come up together with `docker compose up -d` from the repo root (the
root `compose.yaml` `include`s both files) — `sail up` alone only starts
the API side, not the panel.

## Throwaway specs in `e2e/verify/`

Write the check as a Playwright spec in `e2e/verify/` (gitignored — it never
runs in CI). Every spec here **must** import `test`/`expect` from
`../fixtures`, never Playwright's own module directly, to reuse the shared
console/network guard instead of reimplementing it:

```ts
import { expect, test } from '../fixtures';

test('my check', async ({ page }) => {
  await page.goto('/');
  // ...
});
```

The fixture fails the spec on any unexpected browser `console.error`/
`console.warn`, and on any HTTP response with status >= 400. Declare a
narrowly-scoped exception with a single object-valued option — never two
array-valued options:

```ts
test.use({ expectedIssues: { console: [...], responses: [{ url, status }] } });
```

```bash
npx playwright test e2e/verify/my-check.spec.ts
```

There is no `setup` project or seeded auth yet (see `e2e/smoke.spec.ts` and
`playwright.config.ts`) — once login and demo data exist, document the reset/
sign-in convention here so specs can rely on it, the way this skill's source
project (`e2e/helpers.ts` style) does.

Interactive debugging: `--headed` to watch, `--debug` or `await
page.pause()` to step through, `npx playwright show-trace
test-results/<dir>/trace.zip` after a failure, `npx playwright codegen
http://localhost:5174` to record interactions as locators.

Delete the spec when done, or leave it locally — the folder stays out of git.

## Mandatory report lines

A verification is not finished until its final summary contains both of
these lines verbatim:

```text
errores de consola: 0
requests fallidos inesperados: 0
```

A non-zero value on either one means the verification is reported as
**failed** — even when the screenshot looks correct. When non-zero, each
line lists what was found instead of just the count: console entries with
their type and text, failed requests with method, URL and status.

## Gotchas

None recorded yet — there's no real UI beyond the connectivity smoke page.
Add them here as they're discovered (component library quirks, routing
edge cases, etc.), the way a mature Playwright suite accumulates them.

## Mobile layout probes

Repo rule (`CLAUDE.md`): **no page-level horizontal scroll on any viewport**.
Probe the suspect page at the usual widths:

```ts
for (const width of [320, 351, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/the-page');
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);
}
```

Known CSS smell: a deep `whitespace-nowrap` propagates its min-content
through implicit grid tracks — an explicit `grid-cols-1` base cuts it;
`min-w-0` on an intermediate item is not enough.
