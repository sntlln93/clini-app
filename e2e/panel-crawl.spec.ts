import { expect, test } from './fixtures';
import { STORAGE_STATE } from './storage-state';

test.use({ storageState: STORAGE_STATE });

test('panel home renders for an authenticated user', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(
        page.getByRole('heading', { name: 'Agenda', level: 1 }),
    ).toBeVisible();
});

test('/agenda renders for an authenticated user', async ({ page }) => {
    await page.goto('/agenda');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(
        page.getByRole('heading', { name: 'Agenda', level: 1 }),
    ).toBeVisible();
});

test('/pacientes renders for an authenticated user', async ({ page }) => {
    await page.goto('/pacientes');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(
        page.getByRole('heading', { name: 'Pacientes', level: 1 }),
    ).toBeVisible();
});

test('/profesionales renders for an authenticated user', async ({ page }) => {
    await page.goto('/profesionales');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(
        page.getByRole('heading', { name: 'Profesionales', level: 1 }),
    ).toBeVisible();
});

test('/disponibilidad renders for an authenticated user', async ({ page }) => {
    await page.goto('/disponibilidad');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(
        page.getByRole('heading', { name: 'Disponibilidad', level: 1 }),
    ).toBeVisible();
});

test('/disponibilidad/excepciones renders for an authenticated user', async ({
    page,
}) => {
    await page.goto('/disponibilidad/excepciones');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(
        page.getByRole('heading', { name: 'Disponibilidad', level: 1 }),
    ).toBeVisible();
    await expect(
        page.getByRole('button', { name: 'Agregar excepción' }),
    ).toBeVisible();
});

// The setup session is the owner's (#325): the list of exceptional accesses is hers.
test('/accesos-excepcionales renders for the owner', async ({ page }) => {
    await page.goto('/accesos-excepcionales');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(
        page.getByRole('heading', {
            name: 'Accesos a la historia clínica',
            level: 1,
        }),
    ).toBeVisible();
});

test('/ajustes opens its first tab, and every tab renders under the secondary navigation', async ({
    page,
}) => {
    await page.goto('/ajustes');
    await expect(page).toHaveURL(/\/ajustes\/apariencia$/);

    const tabs = page.getByRole('navigation', { name: 'Secciones de Ajustes' });
    const links = tabs.getByRole('link');
    await expect(links).toHaveText([
        'Apariencia',
        'Seguridad',
        'Plan y suscripción',
        'Consultorio',
        'Reservas',
        'Mis especialidades',
        'Profesionales',
        'Protección de datos',
    ]);

    for (const name of await links.allTextContents()) {
        await tabs.getByRole('link', { name }).click();
        await expect(tabs.getByRole('link', { name })).toHaveAttribute(
            'aria-current',
            'page',
        );
        await expect(
            page.getByRole('heading', { name: 'Ajustes', level: 1 }),
        ).toBeVisible();
        await expect(
            page.getByRole('heading', { level: 2 }).first(),
        ).toBeVisible();
    }
});

test('/reportes renders for an authenticated user', async ({ page }) => {
    await page.goto('/reportes');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(
        page.getByRole('heading', { name: 'Reportes', level: 1 }),
    ).toBeVisible();
});
