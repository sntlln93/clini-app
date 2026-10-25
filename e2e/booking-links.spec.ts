import { expect, test } from './fixtures';
import { STORAGE_STATE } from './storage-state';

// #283: ana.duena (owner, not a professional) was offered «Mi link público»,
// which the API rejects for her role, so the link she shared never existed —
// and the public page answered it with the panel's generic error and its
// «Ir al inicio». Ajustes now shows her the practice's own link instead, and
// an unknown link reads as one.

test.describe('booking links from Ajustes', () => {
    test.use({ storageState: STORAGE_STATE });

    test("an owner who doesn't attend patients gets the practice's link, which opens the booking page", async ({
        page,
    }) => {
        await page.goto('/ajustes');

        await expect(
            page.getByRole('heading', {
                name: 'Link de reservas del consultorio',
            }),
        ).toBeVisible();
        await expect(
            page.getByRole('heading', { name: 'Mi link público' }),
        ).toHaveCount(0);

        const link = page.getByRole('link', { name: 'Abrir' });
        await expect(link).toHaveAttribute(
            'href',
            /\/reservar\/clinica-modelo$/,
        );

        await page.goto((await link.getAttribute('href')) ?? '');
        await expect(
            page.getByRole('heading', { name: 'Reservar turno' }),
        ).toBeVisible();
    });
});

test.describe('an unknown booking link', () => {
    test.use({
        expectedIssues: {
            responses: [{ url: /\/api\/v1\/booking\/no-existe$/, status: 404 }],
            // The 404 itself, the query cache's log of it, and the dev-mode
            // noise React and the router log while the route's error boundary
            // takes over.
            console: [
                /Failed to load resource: the server responded with a status of 404 \(Not Found\)/,
                /Query failed: BusinessError: No booking link matches this slug\./,
                /The above error occurred in the <MatchInnerImpl> component/,
                /Error in route match: \/_open\/reservar\/\$slug\/reservar\/no-existe/,
            ],
        },
    });

    test('tells the patient the link does not exist, without the panel controls', async ({
        page,
    }) => {
        await page.goto('/reservar/no-existe');

        await expect(
            page.getByText('Este link de reservas no existe.', {
                exact: false,
            }),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: /Ir al inicio|Ir a la agenda/ }),
        ).toHaveCount(0);
    });
});
