import {
    bookAppointmentWithNewPatient,
    NEW_PATIENT_APPOINTMENT_ISSUES,
} from './agenda';
import { expect, test } from './fixtures';

// #273: the patient page reads its history and notes in its loader
// (`ensureQueryData`), so coming back to it within gcTime serves the cache
// unless the agenda's mutations refresh it. Every move between the two pages
// is client-side (a menu item, the browser's back button): a full page load
// would empty the cache and hide the bug.
//
// Books the appointment through `bookAppointmentWithNewPatient`.
test.use({ expectedIssues: NEW_PATIENT_APPOINTMENT_ISSUES });

test('the patient page reflects a note and a cancellation made from the agenda', async ({
    page,
}) => {
    const { patientName, card } = await bookAppointmentWithNewPatient(page, {
        parallelIndex: test.info().parallelIndex,
        label: '273',
    });
    const openPatientPage = async () => {
        await card.click();
        await page
            .getByRole('menuitem', { name: 'Ver ficha del paciente' })
            .click();
        await expect(
            page.getByRole('heading', { name: patientName, level: 1 }),
        ).toBeVisible();
    };

    // Caches the patient page: one upcoming appointment, no notes yet.
    await openPatientPage();
    await expect(page.getByText('Todavía no hay notas clínicas')).toBeVisible();
    await page.goBack();

    await card.click();
    await page.getByRole('menuitem', { name: 'Notas clínicas' }).click();
    const notesDialog = page.getByRole('dialog', { name: 'Notas clínicas' });
    await notesDialog.getByRole('textbox').fill('Nota escrita desde la agenda');
    await notesDialog.getByRole('button', { name: 'Agregar nota' }).click();
    // Saved: the form clears once the request is done (the text alone
    // also matches while it is still being sent).
    await expect(notesDialog.getByRole('textbox')).toHaveValue('');
    await expect(
        notesDialog.getByText('Nota escrita desde la agenda'),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(notesDialog).toBeHidden();

    await openPatientPage();
    await expect(page.getByText('Nota escrita desde la agenda')).toBeVisible();
    await page.goBack();

    await card.click();
    await page.getByRole('menuitem', { name: 'Cancelar' }).click();
    const cancelDialog = page.getByRole('dialog', { name: 'Cancelar turno' });
    await cancelDialog.getByRole('button', { name: 'Cancelar turno' }).click();
    await expect(cancelDialog).toBeHidden();

    // The agenda hides a cancelled card: forward is the patient page again.
    await page.goForward();
    await expect(
        page.getByRole('heading', { name: patientName, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText('Sin turnos próximos.')).toBeVisible();
});
