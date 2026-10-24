import { readFile } from 'node:fs/promises';
import {
    bookAppointmentWithNewPatient,
    giveClinicalAccessReason,
    NEW_PATIENT_APPOINTMENT_ISSUES,
} from './agenda';
import { expect, test } from './fixtures';

// #326: the professional who attended a patient downloads their clinical
// history from the patient page, as PDF or as JSON, with its access trail,
// which the page shows too (#325).
test.use({ expectedIssues: NEW_PATIENT_APPOINTMENT_ISSUES });

test('the attending professional downloads the patient history as JSON and as PDF', async ({
    page,
}) => {
    const { patientName, card } = await bookAppointmentWithNewPatient(page, {
        parallelIndex: test.info().parallelIndex,
        label: '326',
    });

    await card.click();
    await page.getByRole('menuitem', { name: 'Notas clínicas' }).click();
    const notesDialog = page.getByRole('dialog', { name: 'Notas clínicas' });
    await notesDialog.getByRole('textbox').fill('Control anual sin hallazgos.');
    await notesDialog.getByRole('button', { name: 'Agregar nota' }).click();
    await expect(
        notesDialog.getByText('Control anual sin hallazgos.'),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(notesDialog).toBeHidden();

    await card.click();
    await page
        .getByRole('menuitem', { name: 'Ver ficha del paciente' })
        .click();
    await expect(
        page.getByRole('heading', { name: patientName, level: 1 }),
    ).toBeVisible();
    // The export holds the whole history, so it opens with it (#325).
    await expect(
        page.getByRole('button', { name: 'Exportar historia clínica' }),
    ).toBeHidden();
    await giveClinicalAccessReason(page);

    // The note is Carla's own: the page amends and annuls it like the agenda.
    // Its appointment is years ahead, not today, so nothing new is recorded
    // there: once the amendment saves, the dialog offers no new note.
    await page.getByRole('button', { name: 'Enmendar' }).click();
    const corrected = notesDialog.getByLabel('Texto corregido');
    await expect(corrected).toHaveValue('Control anual sin hallazgos.');
    await corrected.fill('Control anual: TA 120/80, sin hallazgos.');
    await notesDialog.getByRole('button', { name: 'Guardar enmienda' }).click();
    await expect(
        notesDialog.getByRole('button', { name: 'Guardar enmienda' }),
    ).toBeHidden();
    await expect(
        notesDialog.getByRole('button', { name: 'Agregar nota' }),
    ).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(notesDialog).toBeHidden();
    await expect(
        page.getByText('Control anual: TA 120/80, sin hallazgos.').first(),
    ).toBeVisible();
    await expect(
        page.getByRole('button', { name: 'Registrar medicación' }),
    ).toBeHidden();

    await page.getByRole('button', { name: 'Anular' }).click();
    const annulDialog = page.getByRole('dialog', { name: 'Anular nota' });
    await annulDialog
        .getByLabel('Motivo')
        .fill('Cargada en el turno equivocado.');
    await annulDialog.getByRole('button', { name: 'Anular nota' }).click();
    await expect(annulDialog).toBeHidden();
    await expect(page.getByText('Anulada')).toBeVisible();
    await expect(
        page.getByText('Motivo: Cargada en el turno equivocado.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enmendar' })).toBeHidden();
    // The trail is read fresh on every load, so both writes are on it.
    for (const label of ['Enmendó una nota', 'Anuló una nota']) {
        await expect(
            page.getByRole('listitem').filter({ hasText: label }),
        ).toBeVisible();
    }

    const exportButton = page.getByRole('button', {
        name: 'Exportar historia clínica',
    });

    await exportButton.click();
    const jsonDownload = page.waitForEvent('download');
    await page
        .getByRole('menuitem', { name: 'JSON, con los datos estructurados' })
        .click();
    const json = await jsonDownload;
    expect(json.suggestedFilename()).toMatch(/^historia-clinica-\d+\.json$/);
    const record = JSON.parse(await readFile(await json.path(), 'utf8'));
    expect(record.patient.name).toBe(patientName);
    const exportedNote = record.appointments[0].clinical_notes[0];
    expect(exportedNote.versions[0].body).toBe('Control anual sin hallazgos.');
    expect(exportedNote.versions[1].body).toBe(
        'Control anual: TA 120/80, sin hallazgos.',
    );
    expect(exportedNote.annulment.reason).toBe(
        'Cargada en el turno equivocado.',
    );
    expect(record.export.notice).toContain('no es una receta');
    const actions = record.access_log.map(
        (entry: { action: string }) => entry.action,
    );
    expect(actions).toEqual(
        expect.arrayContaining([
            'note_written',
            'exceptional_access',
            'note_amended',
            'note_annulled',
        ]),
    );
    expect(record.access_log.at(-1)).toMatchObject({
        action: 'record_exported',
        export: { scope: 'patient', format: 'json' },
    });
    await expect(
        page
            .getByRole('listitem')
            .filter({ hasText: 'Exportó la historia clínica · JSON' }),
    ).toBeVisible();

    await exportButton.click();
    const pdfDownload = page.waitForEvent('download');
    await page
        .getByRole('menuitem', { name: 'PDF, para leer o imprimir' })
        .click();
    const pdf = await pdfDownload;
    expect(pdf.suggestedFilename()).toMatch(/^historia-clinica-\d+\.pdf$/);
    const bytes = await readFile(await pdf.path());
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
});
