import type { Content } from 'pdfmake/interfaces';

export type ChipColors = {
    fill: string;
    text: string;
    /** A thin outline in this color, for a chip on a fill of its own color. */
    border?: string;
};

/**
 * A label on a wash, without `pill`'s dot: an appointment's status as
 * `AppointmentStatusChip` draws it, or a tag on a record. A struck chip
 * crosses its label out, as the panel does with a status that no longer
 * holds its slot.
 */
export function chip(
    label: string,
    colors: ChipColors,
    { struck = false }: { struck?: boolean } = {},
): Content {
    const border = colors.border;

    return {
        table: {
            widths: ['auto'],
            body: [
                [
                    {
                        text: label,
                        bold: true,
                        fontSize: 8,
                        color: colors.text,
                        decoration: struck ? 'lineThrough' : undefined,
                    },
                ],
            ],
        },
        layout: {
            fillColor: () => colors.fill,
            hLineWidth: () => (border ? 0.75 : 0),
            vLineWidth: () => (border ? 0.75 : 0),
            hLineColor: () => border ?? colors.fill,
            vLineColor: () => border ?? colors.fill,
            paddingLeft: () => 7,
            paddingRight: () => 7,
            paddingTop: () => 2.5,
            paddingBottom: () => 2.5,
        },
    };
}
