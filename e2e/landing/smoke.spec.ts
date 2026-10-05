import { expect, test } from '../fixtures';

// The landing is server-rendered: its content has to be in the HTML the
// server sends, before any JavaScript runs (search engines, link previews).
test('landing renders its content on the server', async ({ request }) => {
    const response = await request.get('/');

    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('lang="es-AR"');
    expect(html).toContain('Tus pacientes reservan solos');
    expect(html).toContain(
        'Empezás gratis. Pagás cuando el consultorio crece.',
    );
});

test('landing hydrates without errors and switches billing and theme', async ({
    page,
}) => {
    await page.goto('/');

    await expect(
        page.getByRole('heading', {
            level: 1,
            name: /Tus pacientes reservan solos/,
        }),
    ).toBeVisible();

    // The server HTML is interactive-looking before React hydrates it: a
    // click that lands earlier changes nothing. Retry until hydration has
    // attached the handlers, instead of guessing a wait.
    const consultorio = page.getByRole('article', { name: 'Consultorio' });
    await expect(consultorio).toContainText('$15.000');
    await expect(async () => {
        await page.getByRole('radio', { name: 'Anual' }).click();
        await expect(consultorio).toContainText('$9.000', { timeout: 1_000 });
    }).toPass();

    await page.getByRole('radio', { name: 'Oscuro' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
});

// CLAUDE.md: no page-level horizontal scroll on any viewport. The plan
// comparison table is wider than a phone and has to scroll inside its own
// wrapper, never push the page.
test('landing has no page-level horizontal scroll on phones', async ({
    page,
}) => {
    for (const width of [320, 360, 400]) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto('/');
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
            `horizontal scroll at ${width}px`,
        ).toBe(true);
    }
});
