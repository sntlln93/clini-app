import { expect, test } from './fixtures';

// #320: the reminder mail links to /turno/<token> for the details it no longer
// carries. A link that shows nothing (forged, or its appointment ended, was
// cancelled or rescheduled) gets one answer, with no panel controls and no
// retry that couldn't help.

const STALE_TOKEN = 'a'.repeat(64);

test.describe('a details link that shows nothing', () => {
    test.use({
        expectedIssues: {
            responses: [
                {
                    url: new RegExp(
                        `/api/v1/booking/appointments/${STALE_TOKEN}$`,
                    ),
                    status: 404,
                },
            ],
            // The 404 itself, the query cache's log of it, and the dev-mode
            // noise React and the router log while the route's error boundary
            // takes over.
            console: [
                /Failed to load resource: the server responded with a status of 404 \(Not Found\)/,
                /Query failed: BusinessError: No appointment details are available for this link\./,
                /The above error occurred in the <MatchInnerImpl> component/,
                /Error in route match: \/_open\/turno\/\$token\/turno\/a+/,
            ],
        },
    });

    test('tells the patient the link no longer shows the appointment', async ({
        page,
    }) => {
        await page.goto(`/turno/${STALE_TOKEN}`);

        await expect(
            page.getByRole('heading', { name: 'Tu turno' }),
        ).toBeVisible();
        await expect(
            page.getByText('Este link ya no muestra el turno', {
                exact: false,
            }),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: 'Reintentar' }),
        ).toHaveCount(0);
        await expect(
            page.getByRole('button', { name: 'Ir al inicio' }),
        ).toHaveCount(0);
    });
});
