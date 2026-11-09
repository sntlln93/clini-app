import { brandMark, type Letterhead } from '@/lib/pdf/letterhead';
import { PDF_COLORS } from '@/lib/pdf/theme';
import type { Content, DynamicContent } from 'pdfmake/interfaces';
import { asPageChrome } from './nodes';

// Clini's brand on the history (#432): it accompanies the practice, which
// every page still names, and never takes its place. Clini is the
// facilitator; the history is the patient's, kept by the practice.

export type ClinicalRecordLetterhead = Letterhead & {
    /** The manifest's `isotype.light`, or null when it couldn't be read. */
    isotypeSvg: string | null;
};

/** 15 mm at the sides, in points. */
export const SIDE_MARGIN = 42;

type Margin = [number, number, number, number];

const CONTENT_WIDTH = 595.28 - SIDE_MARGIN * 2;

function rule(lineWidth: number, lineColor: string): Content {
    return {
        canvas: [
            {
                type: 'line',
                x1: 0,
                y1: 0,
                x2: CONTENT_WIDTH,
                y2: 0,
                lineWidth,
                lineColor,
            },
        ],
    };
}

/**
 * Atop every page: Clini's logotype on the left, the practice and whose
 * history it is on the right, over a rule in the brand's teal.
 */
export function clinicalRecordHeader(
    organization: string,
    patient: string,
    letterhead: ClinicalRecordLetterhead,
): Content {
    return asPageChrome({
        margin: [SIDE_MARGIN, 26, SIDE_MARGIN, 0],
        stack: [
            {
                columns: [
                    {
                        width: 'auto',
                        margin: [0, 2, 0, 0],
                        stack: [brandMark(letterhead, [50, 20], 14)],
                    },
                    {
                        width: '*',
                        alignment: 'right',
                        stack: [
                            { text: organization, bold: true, fontSize: 10.5 },
                            {
                                text: `Historia clínica · ${patient}`,
                                fontSize: 9,
                                color: PDF_COLORS.muted,
                            },
                        ],
                    },
                ],
            },
            { margin: [0, 9, 0, 0], stack: [rule(1.5, PDF_COLORS.primary)] },
        ],
    });
}

/**
 * Under every page: whose history and which practice's on the left; Clini's
 * isotype, «Generada con Clini» and the page on the right. The page count
 * is only known once laid out, so the footer is pdfmake's.
 */
export function clinicalRecordFooter(
    organization: string,
    patient: string,
    letterhead: ClinicalRecordLetterhead,
): DynamicContent {
    return (currentPage, pageCount) =>
        asPageChrome({
            margin: [SIDE_MARGIN, 14, SIDE_MARGIN, 0],
            stack: [
                rule(0.75, PDF_COLORS.border),
                {
                    margin: [0, 8, 0, 0],
                    fontSize: 8,
                    color: PDF_COLORS.muted,
                    columnGap: 4,
                    columns: [
                        {
                            width: '*',
                            text: `Historia clínica de ${patient} · ${organization}`,
                            margin: [0, 0, 8, 0],
                        },
                        ...(letterhead.isotypeSvg
                            ? [
                                  {
                                      width: 8,
                                      margin: [0, 1.5, 0, 0] as Margin,
                                      svg: letterhead.isotypeSvg,
                                      fit: [8, 8] as [number, number],
                                  },
                              ]
                            : []),
                        {
                            width: 'auto',
                            noWrap: true,
                            text: [
                                'Generada con ',
                                {
                                    text: letterhead.brandName,
                                    bold: true,
                                    color: PDF_COLORS.primary,
                                },
                                ` · Página ${currentPage} de ${pageCount}`,
                            ],
                        },
                    ],
                },
            ],
        });
}
