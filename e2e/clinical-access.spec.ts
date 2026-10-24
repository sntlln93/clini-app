import {
    bookAppointmentWithNewPatient,
    giveClinicalAccessReason,
    NEW_PATIENT_APPOINTMENT_ISSUES,
} from './agenda';
import { expect, test } from './fixtures';

// #325: without an own appointment within seven days of today, a professional
// opens a patient's clinical history only after giving a reason, and the
// owner of the practice sees that exceptional access, without anything of the
// history. The helper's appointment is years ahead, so it is out of the window.
test.use({ expectedIssues: NEW_PATIENT_APPOINTMENT_ISSUES });

test('an exceptional access takes a reason and reaches the owner list', async ({
    page,
}) => {
    const { patientName, card } = await bookAppointmentWithNewPatient(page, {
        parallelIndex: test.info().parallelIndex,
        label: '325',
    });

    await card.click();
    await page
        .getByRole('menuitem', { name: 'Ver ficha del paciente' })
        .click();
    await expect(
        page.getByRole('heading', { name: patientName, level: 1 }),
    ).toBeVisible();
    await expect(
        page.getByText(/No tenés un turno con este paciente en los 7 días/),
    ).toBeVisible();
    await expect(
        page.getByText('Todavía no hay notas clínicas para este paciente.'),
    ).toBeHidden();

    await giveClinicalAccessReason(page, 'Resultado de estudio');
    await expect(
        page.getByText('Todavía no hay notas clínicas para este paciente.'),
    ).toBeVisible();
    await expect(
        page.getByText('Todavía no registraste medicación para este paciente.'),
    ).toBeVisible();

    // Carla attends at Consultorio Dos, her most recent membership: its owner
    // is Gabriela. Signing in again probes the session (the declared 401).
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill('gabriela.duena@test.com');
    await page.getByLabel('Contraseña').fill('password');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).not.toHaveURL(/\/login$/);

    await page.goto('/ajustes');
    await page.getByRole('link', { name: 'Ver accesos' }).click();
    await expect(
        page.getByRole('heading', {
            name: 'Accesos a la historia clínica',
            level: 1,
        }),
    ).toBeVisible();
    const row = page.getByRole('row', { name: new RegExp(patientName) });
    await expect(row).toContainText('Carla Profesional');
    await expect(row).toContainText('Resultado de estudio');
});
