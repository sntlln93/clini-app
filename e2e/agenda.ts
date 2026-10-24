import { expect, type Page } from '@playwright/test';

// Signing in at `/login` probes the session first (the 401 and its two
// console lines, as in `auth.setup.ts`); the document lookup's 404 is the
// patient form's expected answer for an unregistered document.
export const NEW_PATIENT_APPOINTMENT_ISSUES = {
    responses: [
        { url: /\/api\/v1\/me$/, status: 401 },
        { url: /\/api\/v1\/patients\/lookup$/, status: 404 },
    ],
    console: [
        /Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/,
        /Query failed: UnauthorizedError: Unauthorized/,
        /Failed to load resource: the server responded with a status of 404 \(Not Found\)/,
    ],
};

/**
 * Signs in as Carla (a professional, unlike the shared `setup` session's
 * owner: only an appointment's own professional writes its clinical records)
 * and books her an appointment with a new patient, returning its card.
 *
 * Unique per run, so a retry or a parallel worker against the same database
 * neither reuses the patient nor collides with another run's slot: one day
 * per second (repeats after ~7 hours), one hour per worker. Always before the
 * seeded 09:00 opening, so the outside-hours warning shows on every run and
 * is confirmed, not raced.
 */
export async function bookAppointmentWithNewPatient(
    page: Page,
    { parallelIndex, label }: { parallelIndex: number; label: string },
) {
    const documentNumber = `${parallelIndex}${String(Date.now()).slice(-7)}`;
    const patientName = `Paciente E2E ${label} ${documentNumber}`;
    const day = new Date(2030, 0, 1 + (Math.floor(Date.now() / 1000) % 25_000));
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const time = `0${6 + (parallelIndex % 3)}:00`;

    await page.goto('/login');
    await page
        .getByLabel('Correo electrónico')
        .fill('carla.profesional@test.com');
    await page.getByLabel('Contraseña').fill('password');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).not.toHaveURL(/\/login$/);

    await page.goto(`/agenda?date=${date}`);
    await page
        .getByRole('button', { name: 'Nuevo turno', exact: true })
        .click();
    const appointmentDialog = page.getByRole('dialog', { name: 'Nuevo turno' });
    await appointmentDialog
        .getByRole('combobox', { name: 'Profesional' })
        .click();
    await page.getByRole('option', { name: 'Carla Profesional' }).click();
    await appointmentDialog.getByRole('combobox', { name: 'Servicio' }).click();
    await page.getByRole('option').first().click();
    await appointmentDialog
        .getByRole('textbox', { name: 'Buscar paciente' })
        .fill(documentNumber);
    await appointmentDialog
        .getByRole('button', { name: 'Registrar paciente nuevo' })
        .click();
    const patientDialog = page.getByRole('dialog', { name: 'Nuevo paciente' });
    await patientDialog.getByLabel('Nombre').fill(patientName);
    await patientDialog
        .getByRole('button', { name: 'Guardar paciente' })
        .click();
    await expect(patientDialog).toBeHidden();
    await appointmentDialog.getByLabel('Fecha').fill(date);
    await appointmentDialog.getByLabel('Hora').fill(time);
    await appointmentDialog
        .getByRole('button', { name: 'Crear turno' })
        .click();
    await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Registrar de todos modos' })
        .click();
    await expect(appointmentDialog).toBeHidden();

    return {
        patientName,
        card: page.getByRole('button', { name: new RegExp(patientName) }),
    };
}

/**
 * Every appointment `bookAppointmentWithNewPatient` books is years ahead, so
 * the patient's page opens the clinical history only once a reason is given
 * (#325, ADR 0022). Run it on that page.
 */
export async function giveClinicalAccessReason(
    page: Page,
    reason = 'Preparar la consulta',
) {
    const giveReason = page.getByRole('button', { name: 'Indicar motivo' });
    await giveReason.click();
    const dialog = page.getByRole('dialog', { name: 'Motivo del acceso' });
    await dialog.getByRole('radio', { name: reason }).click();
    await dialog.getByRole('button', { name: 'Ver historia clínica' }).click();
    await expect(dialog).toBeHidden();
    await expect(giveReason).toBeHidden();
}
