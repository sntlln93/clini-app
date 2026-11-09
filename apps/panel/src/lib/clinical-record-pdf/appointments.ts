import { STATUS_LABELS, STRUCK_STATUSES } from '@/lib/appointment-status';
import { card, cardRows } from '@/lib/pdf/blocks';
import { chip, type ChipColors } from '@/lib/pdf/chip';
import { PDF_COLORS } from '@/lib/pdf/theme';
import type { AppointmentStatus } from '@/types/appointment';
import type { ClinicalRecordAppointment } from '@/types/clinical-record';
import type { Content } from 'pdfmake/interfaces';
import {
    at,
    nameOf,
    noteBlock,
    prescriptionBlock,
    vitalSignBlock,
} from './records';
import { sectionTitle } from './sections';

const SCHEDULED: ChipColors = {
    fill: PDF_COLORS.statusScheduledWash,
    text: PDF_COLORS.statusScheduled,
};

// The panel's status map (`STATUS_TONES`, #235) on the `--status-*` tokens:
// cancelled and rescheduled in the scheduled gray, struck through.
const STATUS_CHIPS: Record<AppointmentStatus, ChipColors> = {
    scheduled: SCHEDULED,
    confirmed: {
        fill: PDF_COLORS.statusConfirmedWash,
        text: PDF_COLORS.statusConfirmed,
    },
    arrived: {
        fill: PDF_COLORS.statusArrivedWash,
        text: PDF_COLORS.statusArrived,
    },
    completed: {
        fill: PDF_COLORS.statusCompletedWash,
        text: PDF_COLORS.statusCompleted,
    },
    no_show: {
        fill: PDF_COLORS.statusNoShowWash,
        text: PDF_COLORS.statusNoShow,
    },
    cancelled: SCHEDULED,
    rescheduled: SCHEDULED,
};

export function statusChip(status: AppointmentStatus): Content {
    return chip(STATUS_LABELS[status], STATUS_CHIPS[status], {
        struck: STRUCK_STATUSES.includes(status),
    });
}

/** When, with whom and what, its reason and cancellation, and its status. */
function appointmentRow(appointment: ClinicalRecordAppointment): Content {
    const details: string[] = [];

    if (appointment.reason) {
        details.push(`Motivo: ${appointment.reason}`);
    }

    if (appointment.cancelled_at) {
        details.push(
            `Cancelado el ${at(appointment.cancelled_at)}${appointment.cancellation_reason ? ` (${appointment.cancellation_reason})` : ''}`,
        );
    }

    return {
        columnGap: 12,
        columns: [
            {
                width: '*',
                stack: [
                    {
                        fontSize: 10.5,
                        text: [
                            { text: at(appointment.start_at), bold: true },
                            {
                                text: [
                                    nameOf(appointment.professional),
                                    appointment.service,
                                ]
                                    .filter(Boolean)
                                    .map((part) => ` · ${part}`)
                                    .join(''),
                                color: PDF_COLORS.muted,
                            },
                        ],
                    },
                    ...(details.length > 0
                        ? [
                              {
                                  text: details.join(' · '),
                                  style: 'meta',
                                  margin: [0, 2, 0, 0] as [
                                      number,
                                      number,
                                      number,
                                      number,
                                  ],
                              },
                          ]
                        : []),
                ],
            },
            { width: 'auto', stack: [statusChip(appointment.status)] },
        ],
    };
}

function hasRecords(appointment: ClinicalRecordAppointment): boolean {
    return (
        appointment.clinical_notes.length +
            appointment.prescriptions.length +
            appointment.vital_signs.length >
        0
    );
}

/**
 * An appointment with records in a card of its own, its records inside;
 * the appointments between them, without records, as rows of one card.
 */
function appointmentCards(
    appointments: ClinicalRecordAppointment[],
): Content[] {
    const cards: Content[] = [];
    let rows: Content[] = [];
    const flush = () => {
        if (rows.length > 0) {
            cards.push(cardRows(rows, [0, 0, 0, 10]));
            rows = [];
        }
    };

    for (const appointment of appointments) {
        if (!hasRecords(appointment)) {
            rows.push(appointmentRow(appointment));
            continue;
        }

        flush();
        cards.push(
            card(
                {
                    stack: [
                        appointmentRow(appointment),
                        ...appointment.clinical_notes.map(noteBlock),
                        ...appointment.prescriptions.map(prescriptionBlock),
                        ...appointment.vital_signs.map(vitalSignBlock),
                    ],
                },
                [0, 0, 0, 10],
            ),
        );
    }

    flush();

    return cards;
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
            : appointmentCards(appointments),
    ];
}
