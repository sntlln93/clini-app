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

Write the check as a Playwright spec in `e2e/verify/` (gitignored, and
ignored by the main Playwright config — it never runs in CI). Every spec here **must** import `test`/`expect` from
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

Run it inside the `e2e` compose service (`npx` never runs on the host). It
boots its own API, panel, dashboard and landing against the isolated
`pgsql-e2e` database, seeded with `DatabaseSeeder`, and the `setup` project
signs in as `ana.duena@test.com` (Clínica Modelo, plan Centro) — so a spec opts
into that session with `test.use({ storageState: STORAGE_STATE })` from
`../storage-state`. `e2e/playwright.verify.config.ts` runs only `e2e/verify/`
(the main config ignores that folder, so a full run never picks it up):

```bash
docker compose --profile e2e run --rm e2e sh -c "cd apps/api && composer install -q && php artisan migrate:fresh --force -q && php artisan db:seed --force -q && cd /workspace && npm install --no-audit --no-fund && npx playwright install chromium && npx playwright test -c e2e/playwright.verify.config.ts verify/my-check --reporter=line"
```

After the first run the database and installs are in place; repeat with just
`npx playwright test -c e2e/playwright.verify.config.ts verify/my-check` as the
`sh -c` command. Screenshots a spec saves under `e2e/verify/` land on the host
(the repo is mounted at `/workspace`). Traces: `test-results/<dir>/trace.zip`
(unzip and read the `*.trace` JSON lines, or open it in
<https://trace.playwright.dev>).

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

- recharts animates bars in: wait ~2 s before a screenshot of a chart, or it
  shows empty axes.
- A filter change on a route with `pendingMs` hides the page while it loads;
  recharts then warns `width(0) and height(0)` in dev (#267). Declare it in
  `expectedIssues` only for a spec that changes filters on purpose.

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
