import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { STORAGE_STATE } from './storage-state';

test.use({ storageState: STORAGE_STATE });

// The seeded practice lists more patients and members than one page of cards
// (12), so reaching the end of the list loads the rest (#306).
async function scrollToTheEnd(page: Page, noun: string) {
    const shown = page.getByText(
        new RegExp(`^Mostrando \\d+ de \\d+ ${noun}$`),
    );

    await expect(async () => {
        await page.mouse.wheel(0, 10_000);
        const [, loaded, total] = /Mostrando (\d+) de (\d+)/.exec(
            (await shown.textContent()) ?? '',
        )!;
        expect(Number(loaded)).toBe(Number(total));
    }).toPass();
}

test('/pacientes shows cards that load page after page, and the table on demand', async ({
    page,
}) => {
    await page.goto('/pacientes');
    const cards = page.getByRole('list', { name: 'Pacientes' });
    await expect(cards.getByRole('listitem')).toHaveCount(12);
    await expect(page.getByRole('table')).toHaveCount(0);

    await scrollToTheEnd(page, 'pacientes');
    expect(await cards.getByRole('listitem').count()).toBeGreaterThan(12);
    await expect(page).not.toHaveURL(/page=/);

    await page.getByRole('button', { name: 'Ver como tabla' }).click();
    await expect(page).toHaveURL(/vista=tabla/);
    await expect(page.getByRole('table')).toBeVisible();
    await expect(cards).toHaveCount(0);

    await page.getByRole('button', { name: 'Ver como tarjetas' }).click();
    await expect(page).not.toHaveURL(/vista=/);
    await cards.getByRole('listitem').first().getByRole('link').first().click();
    await expect(page).toHaveURL(/\/pacientes\/\d+$/);
});

test('/pacientes searches within the cards', async ({ page }) => {
    await page.goto('/pacientes');
    await page.getByLabel('Buscar pacientes').fill('zzz-sin-resultados');

    await expect(
        page.getByRole('heading', { name: 'Sin resultados' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/q=zzz-sin-resultados/);
});

test('/profesionales shows member cards with their specialties, and the table on demand', async ({
    page,
}) => {
    await page.goto('/profesionales');
    const cards = page.getByRole('list', { name: 'Miembros' });
    await expect(cards.getByRole('listitem')).toHaveCount(12);

    await scrollToTheEnd(page, 'miembros');
    // A seeded professional of the practice, with the specialties it attends.
    await expect(
        cards
            .getByRole('listitem')
            .filter({ hasText: /Medicina General|Cardiología|Dermatología/ })
            .first(),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Ver como tabla' }).click();
    await expect(page).toHaveURL(/vista=tabla/);
    await expect(page.getByRole('table')).toBeVisible();
});
