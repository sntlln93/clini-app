import { expect, test } from './fixtures';
import { STORAGE_STATE } from './storage-state';

test.use({ storageState: STORAGE_STATE });

// #266: right after creating a patient nobody has an appointment or a note
// with them, so nobody may read their clinical notes
// (ClinicalNotePolicy::viewAnyForPatient). The page must render anyway, and
// since the patient says so ahead (#325, which absorbed #272), it never asks
// for the notes: no failed request, no console error.
// The document lookup's 404 (`patients.not_found`) is the form's own expected
// answer for an unregistered document.
test.describe('creating a patient lands on its page', () => {
    test.use({
        expectedIssues: {
            responses: [{ url: /\/api\/v1\/patients\/lookup$/, status: 404 }],
            console: [
                /Failed to load resource: the server responded with a status of 404 \(Not Found\)/,
            ],
        },
    });

    test('creating a patient lands on its page', async ({ page }) => {
        // Unique per run, so a retry against the same database creates another patient.
        const documentNumber = String(Date.now()).slice(-8);

        await page.goto('/pacientes/nuevo');
        await page.getByLabel('Nombre').fill('Paciente E2E 266');
        await page.getByLabel('Número de documento').fill(documentNumber);
        await page.getByRole('button', { name: 'Guardar' }).click();

        await expect(page).toHaveURL(/\/pacientes\/\d+$/);
        await expect(
            page.getByRole('heading', { name: 'Paciente E2E 266', level: 1 }),
        ).toBeVisible();
        await expect(
            page.getByText(
                'Solo pueden ver las notas clínicas los profesionales que tienen o tuvieron un turno con este paciente.',
            ),
        ).toBeVisible();
    });
});
