import { expect, test } from './fixtures';
import { STORAGE_STATE } from './storage-state';

// #279: ticking a service in Ajustes used to assign it right away with the
// default duration and no price, and the page refresh after every mutation
// (`router.invalidate()`) scrolled the window back to the top. A short
// viewport keeps the section far below the fold, so a reset is measurable.
test.use({
    storageState: STORAGE_STATE,
    viewport: { width: 1280, height: 700 },
});

test('assigning a service waits for its data and keeps the scroll position', async ({
    page,
}) => {
    const writes: Array<{ method: string; body: unknown }> = [];
    page.on('request', (request) => {
        if (
            request.method() !== 'GET' &&
            /\/api\/v1\/memberships\/\d+\/services/.test(request.url())
        ) {
            writes.push({
                method: request.method(),
                body: request.postDataJSON(),
            });
        }
    });

    await page.goto('/ajustes');
    // Seeded as unassigned for the first professional listed.
    const item = page
        .locator('section', {
            has: page.getByRole('heading', {
                name: 'Servicios por profesional',
            }),
        })
        .getByRole('group', { name: 'Control' })
        .first();
    const checkbox = item.getByRole('checkbox', { name: 'Control' });
    await checkbox.scrollIntoViewIfNeeded();
    // A failed earlier attempt may have left it assigned: start from the seed.
    if (await checkbox.isChecked()) {
        await checkbox.click();
        await page.getByRole('button', { name: 'Confirmar' }).click();
        await expect(checkbox).not.toBeChecked();
        await page.reload();
        await checkbox.scrollIntoViewIfNeeded();
        writes.length = 0;
    }
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);

    await checkbox.click();
    await expect(checkbox).toBeChecked();
    expect(writes).toEqual([]);

    await item.getByLabel('Duración (min)').fill('45');
    await item.getByLabel('Precio ($)').fill('12.000');
    await item.getByRole('button', { name: 'Asignar' }).click();

    await expect(page.getByText('Servicio asignado')).toBeVisible();
    await expect(item.getByRole('button', { name: 'Guardar' })).toBeVisible();
    expect(writes).toEqual([
        {
            method: 'POST',
            body: {
                service_id: expect.any(Number),
                duration_minutes: 45,
                price_cents: 1_200_000,
                active: true,
            },
        },
    ]);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);

    // Removing it again also leaves the seed as it was for the other specs.
    await checkbox.click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Servicio quitado')).toBeVisible();
    await expect(checkbox).not.toBeChecked();
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
});
