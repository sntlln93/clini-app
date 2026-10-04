import type { Page } from '@playwright/test';
import { runA11yScan } from './a11y';
import { expect, test } from './fixtures';
import { STORAGE_STATE } from './storage-state';

// Same anonymous-session-probe noise every other public-route spec declares
// (see smoke.spec.ts) — the network-level 401 and Chromium's own
// resource-load log for it are expected, not evidence of a bug.
const ANONYMOUS_SESSION_PROBE_ISSUES = {
    responses: [{ url: /\/api\/v1\/me$/, status: 401 }],
    console: [
        /Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/,
    ],
};

test.describe('/login (anonymous)', () => {
    test.use({ expectedIssues: ANONYMOUS_SESSION_PROBE_ISSUES });

    test('has no unexpected accessibility violations', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        await runA11yScan(page, '/login');
    });
});

// `networkidle` alone can resolve before the SPA has rendered the page (the
// guard and loaders are still settling), and axe then scans an empty shell —
// no landmark, no heading. Wait for the page's own landmark and title first.
async function waitForPage(page: Page, heading: string) {
    await expect(page.getByRole('main')).toBeVisible();
    await expect(
        page.getByRole('heading', { level: 1, name: heading }),
    ).toBeVisible();
}

test.describe('authenticated views', () => {
    test.use({ storageState: STORAGE_STATE });

    test('/ (dashboard) has no unexpected accessibility violations', async ({
        page,
    }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await waitForPage(page, 'Agenda');

        await runA11yScan(page, '/');
    });

    test('/agenda has no unexpected accessibility violations', async ({
        page,
    }) => {
        await page.goto('/agenda');
        await page.waitForLoadState('networkidle');
        await waitForPage(page, 'Agenda');

        await runA11yScan(page, '/agenda');
    });

    test('/pacientes has no unexpected accessibility violations', async ({
        page,
    }) => {
        await page.goto('/pacientes');
        await page.waitForLoadState('networkidle');
        await waitForPage(page, 'Pacientes');

        await runA11yScan(page, '/pacientes');
    });

    test('/profesionales has no unexpected accessibility violations', async ({
        page,
    }) => {
        await page.goto('/profesionales');
        await page.waitForLoadState('networkidle');
        await waitForPage(page, 'Profesionales');

        await runA11yScan(page, '/profesionales');
    });

    test('/disponibilidad has no unexpected accessibility violations', async ({
        page,
    }) => {
        await page.goto('/disponibilidad');
        await page.waitForLoadState('networkidle');
        await waitForPage(page, 'Disponibilidad');

        await runA11yScan(page, '/disponibilidad');
    });

    test('/ajustes has no unexpected accessibility violations', async ({
        page,
    }) => {
        await page.goto('/ajustes');
        await page.waitForLoadState('networkidle');
        await waitForPage(page, 'Ajustes');

        await runA11yScan(page, '/ajustes');
    });

    test('the "Nuevo turno" appointment form dialog has no unexpected accessibility violations', async ({
        page,
    }) => {
        await page.goto('/agenda');
        await page.waitForLoadState('networkidle');
        await waitForPage(page, 'Agenda');

        await page.getByRole('button', { name: 'Nuevo turno' }).click();
        await expect(
            page.getByRole('dialog', { name: 'Nuevo turno' }),
        ).toBeVisible();

        await runA11yScan(page, '/agenda#nuevo-turno');
    });
});
