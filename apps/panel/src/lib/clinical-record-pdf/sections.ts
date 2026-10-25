import { STATUS_LABELS } from '@/lib/appointment-status';
import { describeTrailEntry } from '@/lib/clinical-access';
import { fromCalendarDate } from '@/lib/datetime';
import type { ClinicalAccessTrailEntry } from '@/types/clinical-access';
import type {
    ClinicalRecordAppointment,
    ClinicalRecordPatient,
} from '@/types/clinical-record';
import type { Content } from 'pdfmake/interfaces';
import { at, nameOf, noteBlock, prescriptionBlock } from './records';

const DOCUMENT_TYPES = { dni: 'DNI', passport: 'Pasaporte' } as const;

const SEXES = { f: 'Femenino', m: 'Masculino', u: 'Sin especificar' } as const;

// A title never ends a page alone (`keepTitlesWithContent`).
function sectionTitle(text: string): Content {
    return { text, style: 'section', headlineLevel: 1 };
}

export function patientSection(patient: ClinicalRecordPatient): Content[] {
    const rows: [string, string][] = [
        ['Nombre', patient.name],
        [
            'Documento',
            `${DOCUMENT_TYPES[patient.document_type]} ${patient.document_number}`,
        ],
    ];

    if (patient.birth_date) {
        rows.push([
            'Fecha de nacimiento',
            fromCalendarDate(patient.birth_date).toFormat('dd/MM/yyyy'),
        ]);
    }

    if (patient.sex) {
        rows.push(['Sexo', SEXES[patient.sex]]);
    }

    if (patient.insurance_provider) {
        rows.push([
            'Cobertura',
            [patient.insurance_provider, patient.insurance_member_number]
                .filter(Boolean)
                .join(' '),
        ]);
    }

    return [
        sectionTitle('Paciente'),
        {
            table: {
                widths: [110, '*'],
                body: rows.map(([label, value]) => [
                    { text: label, style: 'muted' },
                    value,
                ]),
            },
            layout: 'noBorders',
        },
    ];
}

function appointmentBlock(appointment: ClinicalRecordAppointment): Content {
    const details = [STATUS_LABELS[appointment.status]];

    if (appointment.reason) {
        details.push(`Motivo: ${appointment.reason}`);
    }

    if (appointment.cancelled_at) {
        details.push(
            `Cancelado el ${at(appointment.cancelled_at)}${appointment.cancellation_reason ? ` (${appointment.cancellation_reason})` : ''}`,
        );
    }

    return {
        style: 'appointment',
        stack: [
            {
                text: [
                    at(appointment.start_at),
                    nameOf(appointment.professional),
                    appointment.service,
                ]
                    .filter(Boolean)
                    .join(' · '),
                style: 'appointmentTitle',
                headlineLevel: 2,
            },
            { text: details.join(' · '), style: 'muted' },
            ...appointment.clinical_notes.map(noteBlock),
            ...appointment.prescriptions.map(prescriptionBlock),
        ],
    };
}

export function appointmentsSection(
    appointments: ClinicalRecordAppointment[],
): Content[] {
    return [
        sectionTitle('Turnos y actuaciones'),
        appointments.length === 0
            ? {
                  text: 'No hay turnos con este paciente en el consultorio.',
                  style: 'muted',
              }
            : appointments.map(appointmentBlock),
    ];
}

export function accessLogSection(
    entries: ClinicalAccessTrailEntry[],
): Content[] {
    return [
        sectionTitle('Registro de accesos'),
        entries.length === 0
            ? { text: 'No hay accesos registrados.', style: 'muted' }
            : {
                  style: 'trail',
                  table: {
                      headerRows: 1,
                      widths: [80, 110, '*'],
                      body: [
                          ['Fecha y hora', 'Profesional', 'Acción'].map(
                              (text) => ({ text, style: 'muted' }),
                          ),
                          ...entries.map((entry) => [
                              at(entry.created_at),
                              nameOf(entry.professional),
                              describeTrailEntry(entry),
                          ]),
                      ],
                  },
                  layout: 'lightHorizontalLines',
              },
    ];
}
