import { STATUS_LABELS } from '@/lib/appointment-status';
import { describeTrailEntry } from '@/lib/clinical-access';
import { fromCalendarDate } from '@/lib/datetime';
import { CATEGORY_SECTIONS, entryDetails } from '@/lib/medical-history';
import type { ClinicalAccessTrailEntry } from '@/types/clinical-access';
import type {
    ClinicalRecordAppointment,
    ClinicalRecordBloodType,
    ClinicalRecordMedicalHistoryEntry,
    ClinicalRecordPatient,
} from '@/types/clinical-record';
import { MEDICAL_HISTORY_CATEGORIES } from '@/types/medical-history';
import type { Content } from 'pdfmake/interfaces';
import {
    at,
    nameOf,
    noteBlock,
    prescriptionBlock,
    versionLine,
    vitalSignBlock,
} from './records';

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
            ...appointment.vital_signs.map(vitalSignBlock),
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

function backgroundEntryBlock(
    entry: ClinicalRecordMedicalHistoryEntry,
): Content {
    return {
        style: 'record',
        stack: [
            {
                text: `Registrado por ${nameOf(entry.author)} el ${at(entry.created_at)}`,
                style: 'muted',
            },
            ...(entry.withdrawal
                ? [
                      {
                          text: `Ya no vigente desde el ${at(entry.withdrawal.created_at)}, según ${nameOf(entry.withdrawal.author)}.${entry.withdrawal.reason ? ` Motivo: ${entry.withdrawal.reason}` : ''}`,
                          bold: true,
                      },
                  ]
                : []),
            ...entry.versions.map((version): Content => ({
                style: 'version',
                stack: [
                    { text: versionLine(version), style: 'muted' },
                    [version.description, entryDetails(version)]
                        .filter(Boolean)
                        .join(' · '),
                ],
            })),
        ],
    };
}

function bloodTypeLines(records: ClinicalRecordBloodType[]): Content {
    if (records.length === 0) {
        return { text: 'Grupo sanguíneo: sin registrar.', style: 'muted' };
    }

    return {
        stack: [
            { text: 'Grupo sanguíneo', bold: true },
            {
                ul: records.map(
                    (record) =>
                        `${record.blood_type} · ${nameOf(record.author)}, ${at(record.created_at)}${record.reason ? ` · Motivo: ${record.reason}` : ''}`,
                ),
            },
        ],
    };
}

// Of the person rather than of one appointment (#361): the blood type, every
// value oldest first, then each category's entries.
export function backgroundSection(
    bloodTypes: ClinicalRecordBloodType[],
    entries: ClinicalRecordMedicalHistoryEntry[],
): Content[] {
    return [
        sectionTitle('Antecedentes'),
        bloodTypeLines(bloodTypes),
        ...MEDICAL_HISTORY_CATEGORIES.flatMap((category): Content[] => {
            const ofCategory = entries.filter(
                (entry) => entry.category === category,
            );

            return ofCategory.length === 0
                ? []
                : [
                      {
                          text: CATEGORY_SECTIONS[category],
                          bold: true,
                          margin: [0, 8, 0, 0],
                      },
                      ...ofCategory.map(backgroundEntryBlock),
                  ];
        }),
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
