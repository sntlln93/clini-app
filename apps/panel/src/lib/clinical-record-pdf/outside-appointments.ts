import { OUTSIDE_APPOINTMENT_LABEL } from '@/lib/clinical-record-target';
import type { ClinicalRecordOutsideAppointments } from '@/types/clinical-record';
import type { Content } from 'pdfmake/interfaces';
import { noteBlock, prescriptionBlock, vitalSignBlock } from './records';

// What was recorded outside an appointment (#382, ADR 0037), after the
// appointments, in a group of its own; left out when there is nothing, so an
// export without such records reads as before.
export function outsideAppointmentsSection(
    records: ClinicalRecordOutsideAppointments,
): Content[] {
    const blocks: Content[] = [
        ...records.clinical_notes.map(noteBlock),
        ...records.prescriptions.map(prescriptionBlock),
        ...records.vital_signs.map(vitalSignBlock),
    ];

    if (blocks.length === 0) {
        return [];
    }

    return [
        { text: OUTSIDE_APPOINTMENT_LABEL, style: 'section', headlineLevel: 1 },
        {
            text: 'Registrado desde la ficha del paciente, sin un turno.',
            style: 'muted',
        },
        { style: 'appointment', stack: blocks },
    ];
}
