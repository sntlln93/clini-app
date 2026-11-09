import type { Content, TableCell } from 'pdfmake/interfaces';
import { PDF_COLORS } from './theme';

// Shapes every PDF of the panel draws with the theme, as the SPA draws them:
// a card (`card.tsx`: thin border, room inside), a band on the soft surface
// and a pill (`StatusPill`). pdfmake can't round a table's corners, so they
// are square, and cards have no shadow.

type Margin = [number, number, number, number];

const CARD_PADDING = 14;

/** A card's cell: bordered, the content padded inside. */
function cardCell(content: Content): TableCell {
    return {
        stack: [content],
        border: [true, true, true, true],
    };
}

// Odd columns are the gaps of a `cardRow`, never padded.
const cardLayout = {
    hLineWidth: () => 0.75,
    vLineWidth: () => 0.75,
    hLineColor: () => PDF_COLORS.border,
    vLineColor: () => PDF_COLORS.border,
    paddingLeft: (column: number) => (column % 2 === 1 ? 0 : CARD_PADDING),
    paddingRight: (column: number) => (column % 2 === 1 ? 0 : CARD_PADDING),
    paddingTop: () => CARD_PADDING,
    paddingBottom: () => CARD_PADDING,
};

/** A card spanning the width it is given. */
export function card(
    content: Content,
    margin: Margin = [0, 0, 0, 12],
): Content {
    return {
        margin,
        table: { widths: ['*'], body: [[cardCell(content)]] },
        layout: cardLayout,
    };
}

/**
 * Cards side by side, as tall as the tallest: one table row, with a
 * borderless gap between them.
 */
export function cardRow(
    contents: Content[],
    margin: Margin = [0, 0, 0, 12],
    gap = 12,
): Content {
    const cells = contents.flatMap((content, index): TableCell[] =>
        index === 0
            ? [cardCell(content)]
            : [
                  { text: '', border: [false, false, false, false] },
                  cardCell(content),
              ],
    );

    return {
        margin,
        table: {
            widths: contents.flatMap((_, index) =>
                index === 0 ? ['*'] : [gap, '*'],
            ),
            body: [cells],
        },
        layout: cardLayout,
    };
}

/** Columns on the soft surface, spanning the width: a band of facts. */
export function band(
    cells: Content[],
    margin: Margin = [0, 0, 0, 12],
): Content {
    return {
        margin,
        table: {
            widths: cells.map(() => '*'),
            body: [cells.map((cell) => ({ stack: [cell] }))],
        },
        layout: {
            fillColor: () => PDF_COLORS.surface,
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => CARD_PADDING,
            paddingRight: () => CARD_PADDING,
            paddingTop: () => 10,
            paddingBottom: () => 10,
        },
    };
}

/** A label over its value, as a band and a heading print a fact. */
export function fact(label: string, value: string): Content {
    return {
        stack: [
            { text: label, color: PDF_COLORS.muted, fontSize: 8 },
            { text: value, bold: true, fontSize: 10.5, margin: [0, 2, 0, 0] },
        ],
    };
}

export type PillTone = 'success' | 'warning' | 'info';

// `StatusPill`'s tones: amber text is too light on its wash, so `warning`
// keeps the regular text color and puts the amber on the dot.
const PILL_TONES: Record<
    PillTone,
    { fill: string; text: string; dot: string }
> = {
    success: {
        fill: PDF_COLORS.successWash,
        text: PDF_COLORS.success,
        dot: PDF_COLORS.success,
    },
    warning: {
        fill: PDF_COLORS.warningWash,
        text: PDF_COLORS.text,
        dot: PDF_COLORS.warning,
    },
    info: {
        fill: PDF_COLORS.accent,
        text: PDF_COLORS.accentText,
        dot: PDF_COLORS.primary,
    },
};

/** A state label colored by its tone, as `StatusPill` draws one: a dot and the label on a wash. */
export function pill(label: string, tone: PillTone): Content {
    const colors = PILL_TONES[tone];

    return {
        table: {
            widths: ['auto'],
            body: [
                [
                    {
                        columns: [
                            {
                                width: 4,
                                margin: [0, 3.5, 0, 0],
                                canvas: [
                                    {
                                        type: 'ellipse',
                                        x: 2,
                                        y: 2,
                                        r1: 2,
                                        r2: 2,
                                        color: colors.dot,
                                    },
                                ],
                            },
                            {
                                width: 'auto',
                                text: label,
                                bold: true,
                                fontSize: 8,
                                color: colors.text,
                            },
                        ],
                        columnGap: 4,
                    },
                ],
            ],
        },
        layout: {
            fillColor: () => colors.fill,
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 7,
            paddingRight: () => 7,
            paddingTop: () => 2.5,
            paddingBottom: () => 2.5,
        },
    };
}

/** Pills in a row, pushed to the right edge. */
export function pillsRight(pills: Content[]): Content {
    return {
        columns: [
            { width: '*', text: '' },
            ...pills.map((content) => ({
                width: 'auto' as const,
                stack: [content],
            })),
        ],
        columnGap: 4,
    };
}
