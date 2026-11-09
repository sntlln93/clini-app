import { outsideAppointmentSuffix } from '@/lib/clinical-record-target';
import { CATEGORY_SECTIONS, entryDetails } from '@/lib/medical-history';
import { card } from '@/lib/pdf/blocks';
import type {
    ClinicalRecordBloodType,
    ClinicalRecordMedicalHistoryEntry,
} from '@/types/clinical-record';
import { MEDICAL_HISTORY_CATEGORIES } from '@/types/medical-history';
import type { Content } from 'pdfmake/interfaces';
import { at, nameOf, versionHead } from './records';
import { sectionTitle } from './sections';

// Of the person rather than of one appointment (#361): the blood type,
// its current value set apart and every value oldest first, beside each
// category's entries, in one card.

function bloodType(records: ClinicalRecordBloodType[]): Content[] {
    const current = records.at(-1);

    if (current === undefined) {
        return [
            { text: 'Grupo sanguíneo', style: 'label' },
            { text: 'Sin registrar.', style: 'muted', margin: [0, 2, 0, 0] },
        ];
    }

    return [
        { text: 'Grupo sanguíneo', style: 'label' },
        {
            text: current.blood_type,
            bold: true,
            fontSize: 16,
            margin: [0, 2, 0, 3],
        },
        ...records.map((record): Content => ({
            text: `${record.blood_type} · ${nameOf(record.author)}, ${at(record.created_at)}${outsideAppointmentSuffix(record.appointment_id)}${record.reason ? ` · Motivo: ${record.reason}` : ''}`,
            style: 'meta',
        })),
    ];
}

function entryBlock(entry: ClinicalRecordMedicalHistoryEntry): Content {
    return {
        margin: [0, 4, 0, 0],
        stack: [
            {
                text: `Registrado por ${nameOf(entry.author)} el ${at(entry.created_at)}${outsideAppointmentSuffix(entry.appointment_id)}`,
                style: 'meta',
            },
            ...(entry.withdrawal
                ? [
                      {
                          text: `Ya no vigente desde el ${at(entry.withdrawal.created_at)}, según ${nameOf(entry.withdrawal.author)}.${entry.withdrawal.reason ? ` Motivo: ${entry.withdrawal.reason}` : ''}`,
                          bold: true,
                      },
                  ]
                : []),
            ...entry.versions.flatMap((version): Content[] => [
                versionHead(version),
                {
                    text: [version.description, entryDetails(version)]
                        .filter(Boolean)
                        .join(' · '),
                    bold: true,
                },
            ]),
        ],
    };
}

// The first category's label sits level with the blood type's.
function history(entries: ClinicalRecordMedicalHistoryEntry[]): Content[] {
    return MEDICAL_HISTORY_CATEGORIES.map((category) =>
        entries.filter((entry) => entry.category === category),
    ).flatMap((ofCategory, index, categories): Content[] => {
        if (ofCategory.length === 0) {
            return [];
        }

        const first = categories
            .slice(0, index)
            .every((earlier) => earlier.length === 0);

        return [
            {
                text: CATEGORY_SECTIONS[ofCategory[0].category],
                style: 'label',
                margin: [0, first ? 0 : 8, 0, 0],
            },
            ...ofCategory.map(entryBlock),
        ];
    });
}

export function backgroundSection(
    bloodTypes: ClinicalRecordBloodType[],
    entries: ClinicalRecordMedicalHistoryEntry[],
): Content[] {
    const categories = history(entries);

    return [
        sectionTitle('Antecedentes'),
        card(
            {
                columnGap: 20,
                columns: [
                    { width: '*', stack: bloodType(bloodTypes) },
                    ...(categories.length === 0
                        ? []
                        : [{ width: '*' as const, stack: categories }]),
                ],
            },
            [0, 0, 0, 0],
        ),
    ];
}
