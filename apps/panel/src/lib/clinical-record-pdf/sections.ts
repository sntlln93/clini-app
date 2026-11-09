import {
    CLINICAL_ACCESS_ACTION_LABELS,
    describeTrailEntry,
} from '@/lib/clinical-access';
import { fromCalendarDate } from '@/lib/datetime';
import { card } from '@/lib/pdf/blocks';
import { PDF_COLORS } from '@/lib/pdf/theme';
import type { ClinicalAccessTrailEntry } from '@/types/clinical-access';
import type { ClinicalRecordPatient } from '@/types/clinical-record';
import type { Content, TableCell } from 'pdfmake/interfaces';
import { at, nameOf } from './records';

const DOCUMENT_TYPES = { dni: 'DNI', passport: 'Pasaporte' } as const;

const SEXES = { f: 'Femenino', m: 'Masculino', u: 'Sin especificar' } as const;

/** The patient's document as the PDF names it: «DNI 30111222». */
export function documentOf(patient: ClinicalRecordPatient): string {
    return `${DOCUMENT_TYPES[patient.document_type]} ${patient.document_number}`;
}

// In the brand's teal. A title never ends a page alone
// (`keepTitlesWithContent`).
export function sectionTitle(text: string): Content {
    return { text, style: 'section', headlineLevel: 1 };
}

/** A label over its value. */
export function field(label: string, value: string): Content {
    return {
        stack: [
            { text: label, style: 'label' },
            { text: value, margin: [0, 2, 0, 0] },
        ],
    };
}

const PATIENT_COLUMNS = 3;

export function patientSection(patient: ClinicalRecordPatient): Content[] {
    const fields: Content[] = [
        field('Nombre', patient.name),
        field('Documento', documentOf(patient)),
    ];

    if (patient.birth_date) {
        fields.push(
            field(
                'Fecha de nacimiento',
                fromCalendarDate(patient.birth_date).toFormat('dd/MM/yyyy'),
            ),
        );
    }

    if (patient.sex) {
        fields.push(field('Sexo', SEXES[patient.sex]));
    }

    if (patient.insurance_provider) {
        fields.push(
            field(
                'Cobertura',
                [patient.insurance_provider, patient.insurance_member_number]
                    .filter(Boolean)
                    .join(' '),
            ),
        );
    }

    const rows: Content[] = [];

    for (let index = 0; index < fields.length; index += PATIENT_COLUMNS) {
        const row = fields.slice(index, index + PATIENT_COLUMNS);

        rows.push({
            margin: [0, index === 0 ? 0 : 10, 0, 0],
            columnGap: 15,
            columns: Array.from({ length: PATIENT_COLUMNS }, (_, column) => ({
                width: '*' as const,
                stack: [row[column] ?? ''],
            })),
        });
    }

    return [sectionTitle('Paciente'), card({ stack: rows }, [0, 0, 0, 0])];
}

/** An action of the trail, with what it touched in muted text. */
function trailAction(entry: ClinicalAccessTrailEntry): TableCell {
    const description = describeTrailEntry(entry);
    const label = CLINICAL_ACCESS_ACTION_LABELS[entry.action];

    return description.startsWith(label)
        ? {
              text: [
                  label,
                  {
                      text: description.slice(label.length),
                      color: PDF_COLORS.muted,
                  },
              ],
          }
        : { text: description };
}

const TRAIL_WIDTHS = [84, 100, '*'];

// A card holding the table, its heading row on the soft surface and a thin
// rule between rows; one table, so the heading repeats on every page.
const trailLayout = {
    fillColor: (row: number) => (row === 0 ? PDF_COLORS.surface : null),
    hLineWidth: (line: number) => (line === 1 ? 0 : 0.75),
    vLineWidth: (line: number) =>
        line === 0 || line === TRAIL_WIDTHS.length ? 0.75 : 0,
    hLineColor: () => PDF_COLORS.border,
    vLineColor: () => PDF_COLORS.border,
    paddingLeft: (column: number) => (column === 0 ? 12 : 6),
    paddingRight: (column: number) => (column === 2 ? 12 : 6),
    paddingTop: () => 5,
    paddingBottom: () => 5,
};

export function accessLogSection(
    entries: ClinicalAccessTrailEntry[],
): Content[] {
    return [
        sectionTitle('Registro de accesos'),
        {
            text: 'Quién leyó, escribió, enmendó, anuló o exportó esta historia, y cuándo.',
            style: 'meta',
            margin: [0, -3, 0, 8],
        },
        entries.length === 0
            ? { text: 'No hay accesos registrados.', style: 'muted' }
            : {
                  style: 'trail',
                  table: {
                      headerRows: 1,
                      widths: TRAIL_WIDTHS,
                      body: [
                          ['Fecha y hora', 'Profesional', 'Acción'].map(
                              (text) => ({ text, style: 'label' }),
                          ),
                          ...entries.map((entry) => [
                              { text: at(entry.created_at), noWrap: true },
                              nameOf(entry.professional),
                              trailAction(entry),
                          ]),
                      ],
                  },
                  layout: trailLayout,
              },
    ];
}
