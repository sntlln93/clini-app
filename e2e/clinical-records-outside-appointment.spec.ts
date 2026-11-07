import {
    bookAppointmentWithNewPatient,
    giveClinicalAccessReason,
    NEW_PATIENT_APPOINTMENT_ISSUES,
} from './agenda';
import { expect, test } from './fixtures';

// #382: a professional who attends the patient adds to the clinical history
// from the patient page without an appointment today, and the record and its
// row of the access trail say it was outside an appointment. The helper's
// appointment is years ahead, so the history opens with an exceptional access.
test.use({ expectedIssues: NEW_PATIENT_APPOINTMENT_ISSUES });

test('a note added without an appointment is marked in the history and the access trail', async ({
    page,
}) => {
    const { patientName, card } = await bookAppointmentWithNewPatient(page, {
        parallelIndex: test.info().parallelIndex,
        label: '382',
    });

    await card.click();
    await page
        .getByRole('menuitem', { name: 'Ver ficha del paciente' })
        .click();
    await expect(
        page.getByRole('heading', { name: patientName, level: 1 }),
    ).toBeVisible();
    await giveClinicalAccessReason(page, 'Resultado de estudio');

    await page.getByRole('button', { name: 'Agregar nota' }).click();
    await page
        .getByRole('textbox', { name: 'Nueva nota clínica' })
        .fill('Llegó el laboratorio: hemograma normal.');
    await page.getByRole('button', { name: 'Guardar nota' }).click();

    await expect(
        page.getByText('Llegó el laboratorio: hemograma normal.'),
    ).toBeVisible();
    await expect(page.getByText(/· Fuera de un turno/).first()).toBeVisible();
    await expect(
        page.getByRole('listitem').filter({
            hasText: 'Escribió una nota · Fuera de un turno',
        }),
    ).toContainText('Carla Profesional');
});
