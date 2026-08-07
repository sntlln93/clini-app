import { expect, test as setup } from './fixtures';
import { STORAGE_STATE } from './storage-state';

// `/login` runs `redirectIfAuthenticated`, which probes the session before
// the user is authenticated — same 401 the anonymous-visit test in
// `smoke.spec.ts` already declares. Expected console noise from that same
// unauthenticated session check: the browser logs the failed 401 resource
// load, and query-client's onError logs the resulting failed query.
setup.use({
    expectedIssues: {
        responses: [{ url: /\/api\/v1\/me$/, status: 401 }],
        console: [
            /Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/,
            /Query failed: UnauthorizedError: Unauthorized/,
        ],
    },
});

setup('authenticate as ana.duena@test.com', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Correo electrónico').fill('ana.duena@test.com');
    await page.getByLabel('Contraseña').fill('password');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(
        page
            .getByLabel('Navegación principal')
            .getByRole('link', { name: 'Agenda' }),
    ).toBeVisible();

    await page.context().storageState({ path: STORAGE_STATE });
});
