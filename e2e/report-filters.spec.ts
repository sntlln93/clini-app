import { expect, test } from './fixtures';
import { STORAGE_STATE } from './storage-state';

test.use({ storageState: STORAGE_STATE });

// #267: a filter whose loader outlasts `pendingMs` swaps the page for its
// skeleton, and Suspense hides the old page (charts included) with
// `display: none` meanwhile. Charts measure 0×0 then, which recharts'
// ResponsiveContainer reported as a console warning — and the fixture fails
// on any. The report request is held until the skeleton is up, so the hidden
// state happens on every run instead of only when the API is slow.
test('changing a report filter while it loads writes nothing to the console', async ({
    page,
}) => {
    await page.goto('/reportes');
    const charts = page.locator('[data-slot="chart"] svg.recharts-surface');
    await expect(charts).toHaveCount(4);

    let release!: () => void;
    const released = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route(
        /\/api\/v1\/reports\?.*granularity=week/,
        async (route) => {
            await released;
            await route.continue();
        },
    );

    await page.getByRole('combobox', { name: 'Agrupar' }).click();
    await page.getByRole('option', { name: 'Por semana' }).click();

    await expect(
        page.getByRole('status').filter({ hasText: 'Cargando…' }),
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Reportes', level: 1 }),
    ).toBeHidden();
    // Let the charts' ResizeObservers see the hidden layout before it comes back.
    await page.evaluate(
        () =>
            new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
    );
    release();

    await expect(page).toHaveURL(/granularity=week/);
    await expect(
        page.getByRole('heading', { name: 'Reportes', level: 1 }),
    ).toBeVisible();
    await expect(charts).toHaveCount(4);
    for (const chart of await charts.all()) {
        expect(Number(await chart.getAttribute('width'))).toBeGreaterThan(0);
    }
});
