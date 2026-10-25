import { fromInstant } from '@/lib/datetime';
import type {
    ClinicalRecordNote,
    ClinicalRecordPerson,
    ClinicalRecordPrescription,
} from '@/types/clinical-record';
import type { Content } from 'pdfmake/interfaces';

// The records of the history as the PDF prints them (ADR 0023): each note and
// each indicated medication with its versions and, once void, its annulment.

/** In the practice's zone, Luxon's default (`setPracticeTimeZone`). */
export function at(iso: string): string {
    return fromInstant(iso).toFormat('dd/MM/yyyy HH:mm');
}

export function nameOf(person: ClinicalRecordPerson): string {
    return person?.name ?? 'Profesional sin nombre';
}

// Worded as the panel's version history words it: the first version, then
// each amendment with its author, time and reason.
function versionLine(version: {
    version: number;
    author: ClinicalRecordPerson;
    created_at: string;
    reason: string | null;
}): string {
    const who = `${nameOf(version.author)}, ${at(version.created_at)}`;

    if (version.version === 1) {
        return `Versión 1, ${who}`;
    }

    return `Enmienda (versión ${version.version}), ${who}${version.reason ? ` · Motivo: ${version.reason}` : ''}`;
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
        },
    ];
}

export function noteBlock(note: ClinicalRecordNote): Content {
    return {
        style: 'record',
        stack: [
            {
                text: [
                    { text: 'Nota clínica', bold: true },
                    {
                        text: ` · escrita por ${nameOf(note.author)} el ${at(note.created_at)}`,
                        style: 'muted',
                    },
                ],
            },
            ...annulmentLine(note.annulment),
            ...note.versions.map((version): Content => ({
                style: 'version',
                stack: [
                    {
                        text: versionLine(version),
                        style: 'muted',
                    },
                    { text: version.body, preserveLeadingSpaces: true },
                    ...(version.diagnoses.length > 0
                        ? [
                              'Diagnósticos (CIE-10):',
                              {
                                  ul: version.diagnoses.map(
                                      (diagnosis) =>
                                          `${diagnosis.code} · ${diagnosis.description}`,
                                  ),
                              },
                          ]
                        : []),
                ],
            })),
        ],
    };
}

export function prescriptionBlock(
    prescription: ClinicalRecordPrescription,
): Content {
    return {
        style: 'record',
        stack: [
            {
                text: [
                    { text: 'Medicación indicada', bold: true },
                    {
                        text: ` · por ${nameOf(prescription.author)} el ${at(prescription.issued_at)}`,
                        style: 'muted',
                    },
                ],
            },
            ...annulmentLine(prescription.annulment),
            ...prescription.versions.map((version): Content => ({
                style: 'version',
                stack: [
                    {
                        text: versionLine(version),
                        style: 'muted',
                    },
                    {
                        ul: version.items.map(
                            (item) =>
                                `${item.medication}${item.presentation ? `, ${item.presentation}` : ''} · ${item.dosage} · Cantidad: ${item.quantity}`,
                        ),
                    },
                ],
            })),
        ],
    };
}
