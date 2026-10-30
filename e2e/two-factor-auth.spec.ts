import type { Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, test } from './fixtures';
import { totp } from './totp';

// Same anonymous session probe as `auth.setup.ts`: `/login` checks for a
// session before anyone is signed in.
test.use({
    expectedIssues: {
        responses: [{ url: /\/api\/v1\/me$/, status: 401 }],
        console: [
            /Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/,
            /Query failed: UnauthorizedError: Unauthorized/,
        ],
    },
});

// `OrganizationsSeeder::TWO_FACTOR_SECRET`, seeded for julian.staff outside production (#357).
const SEEDED_SECRET = 'KRUG2ZLTMVRXEZLUKRUG2ZLTMVRXEZLU';

async function signIn(page: Page, email: string): Promise<void> {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña').fill('password');
    await page.getByRole('button', { name: 'Ingresar' }).click();
}

test('a user with two-factor authentication enters with the code from the app', async ({
    page,
}, testInfo) => {
    await signIn(page, 'julian.staff@test.com');

    await expect(
        page.getByRole('heading', { name: 'Verificación en dos pasos' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    await page
        .getByLabel('Código de verificación')
        .fill(totp(SEEDED_SECRET, testInfo.retry));
    await page.getByRole('button', { name: 'Verificar' }).click();

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(
        page
            .getByLabel('Navegación principal')
            .getByRole('link', { name: 'Agenda' }),
    ).toBeVisible();
});

// The secret the enable test generated, kept where a retry can read it:
// if the first attempt failed with the factor still on, the retry signs in
// with it and turns the factor off before starting over.
const ELENA_SECRET_FILE = 'e2e/.auth/elena-two-factor-secret.txt';

async function turnOff(page: Page): Promise<void> {
    const section = twoFactorSection(page);
    await section.getByRole('button', { name: 'Desactivar' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Contraseña').fill('password');
    await dialog.getByRole('button', { name: 'Desactivar' }).click();
    await expect(section.getByText('Desactivada')).toBeVisible();
}

function twoFactorSection(page: Page) {
    return page.locator('section', {
        has: page.getByRole('heading', { name: 'Verificación en dos pasos' }),
    });
}

test('a user turns two-factor authentication on from Ajustes and off again', async ({
    page,
}, testInfo) => {
    await signIn(page, 'elena.staff@test.com');
    const codeStep = page.getByLabel('Código de verificación');
    const agendaLink = page
        .getByLabel('Navegación principal')
        .getByRole('link', { name: 'Agenda' });
    await expect(codeStep.or(agendaLink)).toBeVisible();

    if (await codeStep.isVisible()) {
        const leftOver = readFileSync(ELENA_SECRET_FILE, 'utf8');
        await codeStep.fill(totp(leftOver, testInfo.retry));
        await page.getByRole('button', { name: 'Verificar' }).click();
        await expect(agendaLink).toBeVisible();
        await page.goto('/ajustes');
        await turnOff(page);
    }

    await page.goto('/ajustes');
    const section = twoFactorSection(page);
    await expect(section.getByText('Desactivada')).toBeVisible();
    await section.getByRole('button', { name: 'Activar' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Contraseña').fill('password');
    await dialog.getByRole('button', { name: 'Continuar' }).click();
    await expect(
        dialog.getByAltText(
            'Código QR para agregar la cuenta a tu app de autenticación',
        ),
    ).toBeVisible();

    const secret = (await dialog.locator('code').textContent()) ?? '';
    mkdirSync(dirname(ELENA_SECRET_FILE), { recursive: true });
    writeFileSync(ELENA_SECRET_FILE, secret);
    await dialog
        .getByLabel('Código de verificación')
        .fill(totp(secret, testInfo.retry));
    await dialog.getByRole('button', { name: 'Activar' }).click();

    await expect(
        dialog.getByRole('list', { name: 'Códigos de recuperación' }),
    ).toBeVisible();
    await expect(section.getByText('Activada')).toBeVisible();
    await dialog.getByRole('button', { name: 'Listo' }).click();

    await turnOff(page);
});
