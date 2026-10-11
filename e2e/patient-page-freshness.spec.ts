import { expect, test } from './fixtures';

// #273: the patient page reads its history and notes in its loader
// (`ensureQueryData`), so coming back to it within gcTime serves the cache
// unless the agenda's mutations refresh it. Every move between the two pages
// is client-side (a menu item, the browser's back button): a full page load
// would empty the cache and hide the bug.
//
// Signs in as Carla (a professional, unlike the shared `setup` session's
// owner): only an appointment's own professional can write its notes.
// `/login` probes the session first (the 401 and its two console lines, as in
// `auth.setup.ts`); the document lookup's 404 is the patient form's expected
// answer for an unregistered document.
test.use({
    expectedIssues: {
        responses: [
            { url: /\/api\/v1\/me$/, status: 401 },
            { url: /\/api\/v1\/patients\/lookup\?/, status: 404 },
        ],
        console: [
            /Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/,
            /Query failed: UnauthorizedError: Unauthorized/,
            /Failed to load resource: the server responded with a status of 404 \(Not Found\)/,
        ],
    },
});

test('the patient page reflects a note and a cancellation made from the agenda', async ({
    page,
}) => {
    // Unique per run, so a retry or a parallel worker against the same
    // database neither reuses the patient nor collides with another run's
    // slot: one day per second (repeats after ~7 hours), one hour per worker.
    // Always before the seeded 09:00 opening, so the outside-hours warning
    // shows on every run and is confirmed, not raced.
    const documentNumber = `${test.info().parallelIndex}${String(Date.now()).slice(-7)}`;
    const patientName = `Paciente E2E 273 ${documentNumber}`;
    const day = new Date(2030, 0, 1 + (Math.floor(Date.now() / 1000) % 25_000));
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const time = `0${6 + (test.info().parallelIndex % 3)}:00`;

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

    const card = page.getByRole('button', { name: new RegExp(patientName) });
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
