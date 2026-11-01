import type { StatusTone } from '@/components/StatusPill';
import type { MedicationMarks } from '@/types/medication';

export type MedicationMark = { label: string; tone: StatusTone };

// The dispensing conditions worth a mark (#377); «No Clasificada» and its
// variants say nothing to the professional, so they get none.
const DISPENSING_MARKS: Partial<Record<string, MedicationMark>> = {
    'Venta Libre': { label: 'Venta libre', tone: 'neutral' },
    'Venta Bajo Receta': { label: 'Bajo receta', tone: 'info' },
    'Venta Bajo Receta Archivada': {
        label: 'Receta archivada',
        tone: 'warning',
    },
};

// The source writes control marks in capitals and without accents.
const ACCENTED: Partial<Record<string, string>> = {
    psicotropico: 'psicotrópico',
};

const STRONG_CONTROL = /^(ESTUPEFACIENTE|PSICOTROPICO)\b/i;

// «PSICOTROPICO IV» → «Psicotrópico IV», «VENTA VIGILADA» → «Venta
// vigilada»: a roman numeral keeps its capitals.
function controlLabel(mark: string): string {
    const label = mark
        .trim()
        .split(/\s+/)
        .map((word) => {
            if (/^[IVX]+$/.test(word)) {
                return word;
            }
            const lower = word.toLowerCase();

            return ACCENTED[lower] ?? lower;
        })
        .join(' ');

    return label.charAt(0).toUpperCase() + label.slice(1);
}

// The marks a catalog product carries, control first: a narcotic or a
// psychotropic reads as danger, any other control mark as a warning.
export function medicationMarks(marks: MedicationMarks): MedicationMark[] {
    const result: MedicationMark[] = [];

    if (marks.control_mark !== null && marks.control_mark.trim() !== '') {
        result.push({
            label: controlLabel(marks.control_mark),
            tone: STRONG_CONTROL.test(marks.control_mark.trim())
                ? 'danger'
                : 'warning',
        });
    }

    const dispensing =
        marks.dispensing_condition === null
            ? undefined
            : DISPENSING_MARKS[marks.dispensing_condition];
    if (dispensing !== undefined) {
        result.push(dispensing);
    }

    return result;
}
