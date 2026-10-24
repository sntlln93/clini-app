import { readFile } from 'node:fs/promises';
import {
    bookAppointmentWithNewPatient,
    giveClinicalAccessReason,
    NEW_PATIENT_APPOINTMENT_ISSUES,
} from './agenda';
import { expect, test } from './fixtures';

// #326: the professional who attended a patient downloads their clinical
// history from the patient page, as PDF or as JSON.
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
    expect(record.appointments[0].clinical_notes[0].versions[0].body).toBe(
        'Control anual sin hallazgos.',
    );
    expect(record.export.notice).toContain('no es una receta');

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
