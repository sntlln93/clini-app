import { PDF_COLORS } from '@/lib/pdf/theme';
import type { Content } from 'pdfmake/interfaces';

// A measurement's values as the PDF prints them (#432): small white cards on
// the record's soft surface.

const VALUES_PER_ROW = 4;
const VALUE_GAP = 6;

/** A measurement's values as small cards on the record's surface, four to a row. */
export function valueCards(
    values: { label: string; value: string }[],
): Content[] {
    const rows: { label: string; value: string }[][] = [];

    for (let index = 0; index < values.length; index += VALUES_PER_ROW) {
        rows.push(values.slice(index, index + VALUES_PER_ROW));
    }

    return rows.map((row): Content => ({
        margin: [0, 4, 0, 0],
        table: {
            widths: Array.from(
                { length: VALUES_PER_ROW * 2 - 1 },
                (_, column) => (column % 2 === 1 ? VALUE_GAP : '*'),
            ),
            body: [
                Array.from({ length: VALUES_PER_ROW }).flatMap((_, column) => {
                    const value = row[column];
                    const cell = value
                        ? {
                              fillColor: PDF_COLORS.card,
                              stack: [
                                  { text: value.label, style: 'label' },
                                  {
                                      text: value.value,
                                      bold: true,
                                      fontSize: 11,
                                  },
                              ],
                          }
                        : { text: '' };

                    return column === 0 ? [cell] : [{ text: '' }, cell];
                }),
            ],
        },
        layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: (column: number) => (column % 2 === 1 ? 0 : 9),
            paddingRight: (column: number) => (column % 2 === 1 ? 0 : 9),
            paddingTop: () => 5,
            paddingBottom: () => 5,
        },
    }));
}
