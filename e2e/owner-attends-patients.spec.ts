import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

// #278: an owner who registered used to be no professional at all, so the
// agenda hid «Nuevo turno» with no hint of the role it takes. The register
// form now asks, and the empty state lets an owner join as one.
test.use({
    expectedIssues: {
        responses: [{ url: /\/api\/v1\/me$/, status: 401 }],
        console: [
            /Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/,
        ],
    },
});

async function register(page: Page, attendsPatients: boolean) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await page.goto('/registro');
    await page.getByLabel('Nombre', { exact: true }).fill('Dueña Nueva');
    await page
        .getByLabel('Nombre del consultorio')
        .fill(`Consultorio ${suffix}`);
    await page
        .getByLabel('Correo electrónico')
        .fill(`duena-${suffix}@test.com`);
    await page.getByLabel('Contraseña', { exact: true }).fill('password123');
    await page.getByLabel('Confirmar contraseña').fill('password123');

    const attends = page.getByRole('checkbox', {
        name: 'También atiendo pacientes',
    });
    await expect(attends).toBeChecked();
    if (!attendsPatients) {
        await attends.click();
        await expect(attends).not.toBeChecked();
    }

    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page).toHaveURL(/\/agenda/);
}

test('an owner who attends patients can book from the agenda right after registering', async ({
    page,
}) => {
    await register(page, true);

    await expect(
        page.getByRole('button', { name: 'Nuevo turno' }),
    ).toBeVisible();
    await expect(page.getByText('Todavía no hay profesionales')).toHaveCount(0);
});

test('an owner who registered without attending can join as a professional from the agenda', async ({
    page,
}) => {
    await register(page, false);

    await expect(page.getByText('Todavía no hay profesionales')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nuevo turno' })).toHaveCount(
        0,
    );

    await page
        .getByRole('button', { name: 'Sumarme como profesional' })
        .click();

    await expect(
        page.getByRole('button', { name: 'Nuevo turno' }),
    ).toBeVisible();
    await expect(page.getByText('Todavía no hay profesionales')).toHaveCount(0);
});
