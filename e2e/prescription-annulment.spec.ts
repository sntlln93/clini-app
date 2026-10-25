import { readFile } from 'node:fs/promises';
import {
    bookAppointmentWithNewPatient,
    giveClinicalAccessReason,
    NEW_PATIENT_APPOINTMENT_ISSUES,
} from './agenda';
import { expect, test } from './fixtures';

// #344: indicated medication is annulled with a reason, from the agenda and
// from the patient page. It stays in the history, marked as annulled with its
// items behind a disclosure, and the trail and the export say so.
test.use({ expectedIssues: NEW_PATIENT_APPOINTMENT_ISSUES });

test('indicated medication is annulled from the agenda and from the patient page, and stays in the history', async ({
    page,
}) => {
    const { patientName, card } = await bookAppointmentWithNewPatient(page, {
        parallelIndex: test.info().parallelIndex,
        label: '344',
    });

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

    await medicationDialog.getByRole('button', { name: 'Anular' }).click();
    const annulDialog = page.getByRole('dialog', {
        name: 'Anular medicación',
    });
    await annulDialog.getByLabel('Motivo').fill('Terminó el tratamiento.');
    await annulDialog
        .getByRole('button', { name: 'Anular medicación' })
        .click();
    await expect(annulDialog).toBeHidden();
    await expect(
        medicationDialog.getByText('Anulada', { exact: true }),
    ).toBeVisible();
    await expect(
        medicationDialog.getByText('Motivo: Terminó el tratamiento.'),
    ).toBeVisible();
    // Behind a disclosure, as an annulled note's text.
    await expect(medicationDialog.getByText('Ibuprofeno × 1')).toBeHidden();
    await expect(
        medicationDialog.getByText('Ver la medicación anulada'),
    ).toBeVisible();
    await expect(
        medicationDialog.getByRole('button', { name: 'Anular' }),
    ).toHaveCount(0);

    await medicationDialog.getByLabel('Medicamento').fill('Amoxicilina');
    await medicationDialog.getByLabel('Posología').fill('1 cada 12 h');
    await medicationDialog
        .getByRole('button', { name: 'Registrar medicación' })
        .click();
    await expect(medicationDialog.getByText('Amoxicilina × 1')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(medicationDialog).toBeHidden();

    await card.click();
    await page
        .getByRole('menuitem', { name: 'Ver ficha del paciente' })
        .click();
    await expect(
        page.getByRole('heading', { name: patientName, level: 1 }),
    ).toBeVisible();
    await giveClinicalAccessReason(page);
    const annulmentsInTrail = page
        .getByRole('listitem')
        .filter({ hasText: 'Anuló medicación indicada' });
    await expect(annulmentsInTrail).toHaveCount(1);

    // Only the record still in force takes an action.
    await page.getByRole('button', { name: 'Anular' }).click();
    await annulDialog
        .getByLabel('Motivo')
        .fill('Indicada en el turno equivocado.');
    await annulDialog
        .getByRole('button', { name: 'Anular medicación' })
        .click();
    await expect(annulDialog).toBeHidden();

    await expect(page.getByText('Anulada', { exact: true })).toHaveCount(2);
    await expect(
        page.getByText('Motivo: Indicada en el turno equivocado.'),
    ).toBeVisible();
    const amoxicillin = page
        .locator('details')
        .filter({ hasText: 'Amoxicilina' });
    await expect(amoxicillin.getByText('Amoxicilina')).toBeHidden();
    await amoxicillin.getByText('Ver la medicación anulada').click();
    await expect(amoxicillin.getByText('Amoxicilina')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Anular' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Enmendar' })).toHaveCount(0);
    // The trail is read fresh on every load, so this annulment joins the
    // agenda's on it.
    await expect(annulmentsInTrail).toHaveCount(2);

    await page
        .getByRole('button', { name: 'Exportar historia clínica' })
        .click();
    const jsonDownload = page.waitForEvent('download');
    await page
        .getByRole('menuitem', { name: 'JSON, con los datos estructurados' })
        .click();
    const json = await jsonDownload;
    const record = JSON.parse(await readFile(await json.path(), 'utf8'));
    const annulments = record.appointments[0].prescriptions.map(
        (prescription: {
            versions: { items: { medication: string }[] }[];
            annulment: { reason: string } | null;
        }) => [
            prescription.versions[0].items[0].medication,
            prescription.annulment?.reason,
        ],
    );
    expect(annulments).toEqual([
        ['Ibuprofeno', 'Terminó el tratamiento.'],
        ['Amoxicilina', 'Indicada en el turno equivocado.'],
    ]);
    expect(
        record.access_log.filter(
            (entry: { action: string }) =>
                entry.action === 'prescription_annulled',
        ),
    ).toHaveLength(2);
});
