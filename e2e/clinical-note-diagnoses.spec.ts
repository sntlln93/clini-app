import {
    bookAppointmentWithNewPatient,
    giveClinicalAccessReason,
    NEW_PATIENT_APPOINTMENT_ISSUES,
} from './agenda';
import { expect, test } from './fixtures';

// #324: a note carries optional ICD-10 diagnoses next to its free text,
// picked from the seeded catalog; changing them is an amendment.
test.use({ expectedIssues: NEW_PATIENT_APPOINTMENT_ISSUES });

test('a note gets ICD-10 diagnoses from the catalog, and changing them is an amendment', async ({
    page,
}) => {
    const { patientName, card } = await bookAppointmentWithNewPatient(page, {
        parallelIndex: test.info().parallelIndex,
        label: '324',
    });

    await card.click();
    await page.getByRole('menuitem', { name: 'Notas clínicas' }).click();
    const notesDialog = page.getByRole('dialog', { name: 'Notas clínicas' });
    await notesDialog.getByRole('textbox').fill('Dolor de garganta y fiebre.');
    const diagnoses = notesDialog.getByRole('combobox', {
        name: 'Diagnósticos CIE-10 (opcional)',
    });
    await diagnoses.fill('faringitis');
    await page.getByRole('option', { name: /J02\.9/ }).click();
    await diagnoses.fill('r51');
    await page.getByRole('option', { name: /R51/ }).click();
    await notesDialog.getByRole('button', { name: 'Agregar nota' }).click();

    const noteDiagnoses = notesDialog.getByRole('list', {
        name: 'Diagnósticos CIE-10',
    });
    await expect(noteDiagnoses).toHaveText([
        /J02\.9\s*Faringitis aguda, no especificada\s*R51\s*Cefalea/,
    ]);

    await notesDialog.getByRole('button', { name: 'Enmendar' }).click();
    await notesDialog.getByRole('button', { name: 'Quitar R51' }).click();
    await notesDialog
        .getByLabel('Motivo de la enmienda (opcional)')
        .fill('La cefalea era parte del cuadro.');
    await notesDialog.getByRole('button', { name: 'Guardar enmienda' }).click();
    await expect(noteDiagnoses.first()).toHaveText(
        /^J02\.9\s*Faringitis aguda, no especificada$/,
    );
    await notesDialog.getByText(/Ver las 2 versiones/).click();
    await expect(noteDiagnoses.last()).toHaveText(/R51\s*Cefalea/);
    await page.keyboard.press('Escape');
    await expect(notesDialog).toBeHidden();

    // The patient's record shows the current diagnoses too.
    await card.click();
    await page
        .getByRole('menuitem', { name: 'Ver ficha del paciente' })
        .click();
    await expect(
        page.getByRole('heading', { name: patientName, level: 1 }),
    ).toBeVisible();
    await giveClinicalAccessReason(page);
    await expect(
        page.getByText('Faringitis aguda, no especificada').first(),
    ).toBeVisible();
});
