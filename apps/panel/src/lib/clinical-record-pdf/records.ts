import { fromInstant } from '@/lib/datetime';
import { band } from '@/lib/pdf/blocks';
import { chip } from '@/lib/pdf/chip';
import { PDF_COLORS } from '@/lib/pdf/theme';
import { presentValues } from '@/lib/vital-signs';
import type {
    ClinicalRecordNote,
    ClinicalRecordPerson,
    ClinicalRecordPrescription,
    ClinicalRecordVitalSign,
} from '@/types/clinical-record';
import type { Content } from 'pdfmake/interfaces';
import { valueCards } from './value-cards';

// The records of the history as the PDF prints them (ADR 0023): each note,
// indicated medication and measurement on the soft surface, with its
// versions and, once void, its annulment.

/** In the practice's zone, Luxon's default (`setPracticeTimeZone`). */
export function at(iso: string): string {
    return fromInstant(iso).toFormat('dd/MM/yyyy HH:mm');
}

export function nameOf(person: ClinicalRecordPerson): string {
    return person?.name ?? 'Profesional sin nombre';
}

type Version = {
    version: number;
    author: ClinicalRecordPerson;
    created_at: string;
    reason: string | null;
};

/** Who wrote a version and when, with the amendment's reason. */
function authorship(version: Version): string {
    return `${nameOf(version.author)}, ${at(version.created_at)}${version.reason ? ` · Motivo: ${version.reason}` : ''}`;
}

/**
 * A version's heading, worded as the panel's version history words it: the
 * first version as a line, each amendment marked with a chip.
 */
export function versionHead(version: Version): Content {
    if (version.version === 1) {
        return {
            text: `Versión 1, ${authorship(version)}`,
            style: 'meta',
            margin: [0, 3, 0, 2],
        };
    }

    return {
        margin: [0, 8, 0, 3],
        columnGap: 6,
        columns: [
            {
                width: 'auto',
                stack: [
                    chip(`Enmienda · versión ${version.version}`, {
                        fill: PDF_COLORS.card,
                        text: PDF_COLORS.primary,
                        border: PDF_COLORS.primary,
                    }),
                ],
            },
            {
                width: '*',
                text: authorship(version),
                style: 'meta',
                margin: [0, 2, 0, 0],
            },
        ],
    };
}

/** What kind of record, in the brand's teal, and who made it when. */
function recordHeading(kind: string, byline: string): Content {
    return {
        text: [
            { text: kind, style: 'recordKind' },
            { text: ` · ${byline}`, style: 'meta' },
        ],
    };
}

// Above the versions, so a void record reads as one from the start: who
// annulled it, when and why.
function annulmentLine(annulment: ClinicalRecordNote['annulment']): Content[] {
    if (annulment === null) {
        return [];
    }

    return [
        {
            text: `Anulada el ${at(annulment.created_at)} por ${nameOf(annulment.author)}. Motivo: ${annulment.reason}`,
            bold: true,
            margin: [0, 3, 0, 0],
        },
    ];
}

/** A record on the soft surface, inside its appointment's card. */
function recordBox(stack: Content[]): Content {
    return band([{ stack }], [0, 10, 0, 0]);
}

function diagnoses(version: ClinicalRecordNote['versions'][number]): Content[] {
    if (version.diagnoses.length === 0) {
        return [];
    }

    return [
        {
            margin: [0, 6, 0, 0],
            columnGap: 8,
            columns: [
                {
                    width: 'auto',
                    text: 'Diagnósticos (CIE-10)',
                    style: 'label',
                    margin: [0, 2, 0, 0],
                },
                {
                    width: '*',
                    stack: version.diagnoses.map((diagnosis) => ({
                        margin: [0, 0, 0, 3] as [
                            number,
                            number,
                            number,
                            number,
                        ],
                        stack: [
                            chip(
                                `${diagnosis.code} · ${diagnosis.description}`,
                                {
                                    fill: PDF_COLORS.accent,
                                    text: PDF_COLORS.accentText,
                                },
                            ),
                        ],
                    })),
                },
            ],
        },
    ];
}

export function noteBlock(note: ClinicalRecordNote): Content {
    return recordBox([
        recordHeading(
            'Nota clínica',
            `escrita por ${nameOf(note.author)} el ${at(note.created_at)}`,
        ),
        ...annulmentLine(note.annulment),
        ...note.versions.flatMap((version): Content[] => [
            versionHead(version),
            { text: version.body, preserveLeadingSpaces: true },
            ...diagnoses(version),
        ]),
    ]);
}

export function prescriptionBlock(
    prescription: ClinicalRecordPrescription,
): Content {
    return recordBox([
        recordHeading(
            'Medicación indicada',
            `por ${nameOf(prescription.author)} el ${at(prescription.issued_at)}`,
        ),
        ...annulmentLine(prescription.annulment),
        ...prescription.versions.flatMap((version): Content[] => [
            versionHead(version),
            ...version.items.map((item): Content => ({
                margin: [0, 2, 0, 0],
                stack: [
                    {
                        text: `${item.medication}${item.presentation ? `, ${item.presentation}` : ''}`,
                        bold: true,
                    },
                    {
                        text: `${item.dosage} · Cantidad: ${item.quantity}`,
                        fontSize: 9.5,
                    },
                ],
            })),
            ...(version.allergy_warning_overridden
                ? [
                      {
                          text: 'Indicada pese a un aviso de alergia.',
                          style: 'meta',
                          margin: [0, 3, 0, 0] as [
                              number,
                              number,
                              number,
                              number,
                          ],
                      },
                  ]
                : []),
        ]),
    ]);
}

export function vitalSignBlock(vitalSign: ClinicalRecordVitalSign): Content {
    return recordBox([
        recordHeading(
            'Medición',
            `tomada por ${nameOf(vitalSign.author)} el ${at(vitalSign.measured_at)}`,
        ),
        ...annulmentLine(vitalSign.annulment),
        ...vitalSign.versions.flatMap((version): Content[] => [
            versionHead(version),
            ...valueCards(presentValues(version.values)),
        ]),
    ]);
}
