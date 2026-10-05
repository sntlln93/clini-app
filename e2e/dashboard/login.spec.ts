import { expect, test } from '../fixtures';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
const DASHBOARD_URL = process.env.E2E_DASHBOARD_URL ?? 'http://localhost:5175';
const PANEL_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5174';

// The anonymous session probe (`GET /api/v1/admin/me`) that both `_auth` and
// `_public` run: a 401 at the network level, plus the console noise the
// browser and the query cache log for it — the same pair `e2e/auth.setup.ts`
// declares for the panel's identical `/api/v1/me` probe.
const ANONYMOUS_PROBE_RESPONSE = { url: /\/api\/v1\/admin\/me$/, status: 401 };
const ANONYMOUS_PROBE_CONSOLE = [
    /Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/,
    /Query failed: UnauthorizedError: Unauthorized/,
];

// Only seeded outside production (PlatformAdminSeeder).
const OPERATOR_EMAIL = 'operador@test.com';
const OPERATOR_PASSWORD = 'password';

// The admin login is throttled at 5/min per email+ip: this file makes at most
// two attempts per run (×2 with CI's `retries: 1`).

test.describe('dashboard redirects an anonymous visitor to login', () => {
    test.use({
        expectedIssues: {
            responses: [ANONYMOUS_PROBE_RESPONSE],
            console: ANONYMOUS_PROBE_CONSOLE,
        },
    });

    test('dashboard redirects an anonymous visitor to login', async ({
        page,
    }) => {
        await page.goto('/');

        await expect(page).toHaveURL(/\/login$/);
        await expect(page.locator('html')).toHaveAttribute('lang', 'es-AR');
        await expect(
            page.getByRole('heading', { name: 'Iniciar sesión' }),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: 'Ingresar' }),
        ).toBeVisible();
    });
});

test.describe('operator login', () => {
    test.use({
        expectedIssues: {
            responses: [
                ANONYMOUS_PROBE_RESPONSE,
                // The clinic API probe below. It is an APIRequestContext call,
                // not a page response, so the fixture likely never sees it —
                // declared anyway so it can't turn into a false failure.
                { url: /\/api\/v1\/me$/, status: 401 },
            ],
            console: ANONYMOUS_PROBE_CONSOLE,
        },
    });

    test('an operator logs in, is unknown to the clinic API, and logs out', async ({
        page,
    }) => {
        await page.goto('/login');
        await page.getByLabel('Correo electrónico').fill(OPERATOR_EMAIL);
        await page.getByLabel('Contraseña').fill(OPERATOR_PASSWORD);
        await page.getByRole('button', { name: 'Ingresar' }).click();

        await expect(page).not.toHaveURL(/\/login$/);
        await expect(
            page.getByRole('heading', { name: 'Resumen', level: 1 }),
        ).toBeVisible();
        await expect(
            page
                .getByLabel('Navegación principal')
                .getByRole('link', { name: 'Organizaciones' }),
        ).toBeVisible();

        // Same browser session, clinic API as the panel calls it: the
        // operator is not a clinic user.
        const clinicMe = await page.request.get(`${API_URL}/api/v1/me`, {
            // JSON, like the SPAs' axios: without it Laravel answers an
            // unauthenticated request with a redirect to a `login` route the
            // API doesn't define (500), not a 401.
            headers: {
                Accept: 'application/json',
                Referer: `${PANEL_URL}/`,
            },
        });
        expect(clinicMe.status()).toBe(401);

        // From the dashboard origin the clinic API is off-limits altogether
        // (`clinic.origin`, ADR 0010).
        const clinicFromDashboard = await page.request.get(
            `${API_URL}/api/v1/me`,
            {
                headers: {
                    Accept: 'application/json',
                    Referer: `${DASHBOARD_URL}/`,
                },
            },
        );
        expect(clinicFromDashboard.status()).toBe(403);

        await page.getByRole('button', { name: 'Menú del operador' }).click();
        await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();

        await expect(page).toHaveURL(/\/login$/);
    });
});

test.describe('operator login with a wrong password', () => {
    test.use({
        expectedIssues: {
            responses: [
                ANONYMOUS_PROBE_RESPONSE,
                { url: /\/api\/v1\/admin\/login$/, status: 422 },
            ],
            console: [
                ...ANONYMOUS_PROBE_CONSOLE,
                /Failed to load resource: the server responded with a status of 422 \(Unprocessable (Content|Entity)\)/,
            ],
        },
    });

    test('shows the Spanish invalid-credentials message', async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Correo electrónico').fill(OPERATOR_EMAIL);
        await page.getByLabel('Contraseña').fill('contraseña-incorrecta');
        await page.getByRole('button', { name: 'Ingresar' }).click();

        await expect(
            page.getByText('Correo o contraseña incorrectos.'),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/login$/);
    });
});
