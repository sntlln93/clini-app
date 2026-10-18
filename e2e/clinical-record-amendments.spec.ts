import {
    bookAppointmentWithNewPatient,
    NEW_PATIENT_APPOINTMENT_ISSUES,
} from './agenda';
import { expect, test } from './fixtures';

// #323: the clinical history is append-only. A note or a medication record
// is never edited or deleted: it is amended, keeping every earlier version,
// and a note is annulled with a reason instead of deleted.
test.use({ expectedIssues: NEW_PATIENT_APPOINTMENT_ISSUES });

test('a note and a medication record are amended and annulled, never edited or deleted', async ({
    page,
}) => {
    const { patientName, card } = await bookAppointmentWithNewPatient(page, {
        parallelIndex: test.info().parallelIndex,
        label: '323',
    });

    await card.click();
    await page.getByRole('menuitem', { name: 'Notas clínicas' }).click();
    const notesDialog = page.getByRole('dialog', { name: 'Notas clínicas' });
    await notesDialog.getByRole('textbox').fill('Dolor lumbar de 3 días.');
    await notesDialog.getByRole('button', { name: 'Agregar nota' }).click();
    await expect(
        notesDialog.getByText('Dolor lumbar de 3 días.'),
    ).toBeVisible();
    await expect(
        notesDialog.getByRole('button', { name: 'Editar' }),
    ).toHaveCount(0);
    await expect(
        notesDialog.getByRole('button', { name: 'Borrar' }),
    ).toHaveCount(0);

    await notesDialog.getByRole('button', { name: 'Enmendar' }).click();
    await notesDialog
        .getByLabel('Texto corregido')
        .fill('Dolor lumbar de 5 días.');
    await notesDialog
        .getByLabel('Motivo de la enmienda (opcional)')
        .fill('Duración mal anotada.');
    await notesDialog.getByRole('button', { name: 'Guardar enmienda' }).click();
    await expect(
        notesDialog.getByText('Dolor lumbar de 5 días.').first(),
    ).toBeVisible();
    await notesDialog.getByText(/Ver las 2 versiones/).click();
    await expect(
        notesDialog.getByText('Dolor lumbar de 3 días.'),
    ).toBeVisible();
    await expect(
        notesDialog.getByText('Motivo: Duración mal anotada.'),
    ).toBeVisible();

    await notesDialog.getByRole('button', { name: 'Anular' }).click();
    const annulDialog = page.getByRole('dialog', { name: 'Anular nota' });
    await annulDialog
        .getByLabel('Motivo')
        .fill('Cargada en el turno equivocado.');
    await annulDialog.getByRole('button', { name: 'Anular nota' }).click();
    await expect(annulDialog).toBeHidden();
    await expect(
        notesDialog.getByText('Anulada', { exact: true }),
    ).toBeVisible();
    await expect(
        notesDialog.getByRole('button', { name: 'Enmendar' }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(notesDialog).toBeHidden();

    await card.click();
    await page.getByRole('menuitem', { name: 'Medicación' }).click();
    const medicationDialog = page.getByRole('dialog', {
        name: 'Medicación indicada',
    });
    await medicationDialog.getByLabel('Medicamento').fill('Ibuprofeno');
    await medicationDialog.getByLabel('Posología').fill('1 cada 8 h');
    await medicationDialog
        .getByRole('button', { name: 'Registrar medicación' })
        .click();
    await expect(medicationDialog.getByText('Ibuprofeno × 1')).toBeVisible();

    await medicationDialog.getByRole('button', { name: 'Enmendar' }).click();
    await expect(medicationDialog.getByLabel('Medicamento')).toHaveValue(
        'Ibuprofeno',
    );
    await medicationDialog.getByLabel('Medicamento').fill('Paracetamol');
    await medicationDialog
        .getByRole('button', { name: 'Guardar enmienda' })
        .click();
    await expect(medicationDialog.getByText('Paracetamol × 1')).toBeVisible();
    await expect(
        medicationDialog.getByText(/Ver las 2 versiones/),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(medicationDialog).toBeHidden();

    // The patient page keeps the whole history too.
    await card.click();
    await page
        .getByRole('menuitem', { name: 'Ver ficha del paciente' })
        .click();
    await expect(
        page.getByRole('heading', { name: patientName, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText('Anulada', { exact: true })).toBeVisible();
    await expect(
        page.getByText('Motivo: Cargada en el turno equivocado.'),
    ).toBeVisible();
    await expect(page.getByText('Paracetamol', { exact: true }).first()).toBeVisible();
});
