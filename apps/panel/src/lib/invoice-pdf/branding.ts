import type { Content, DynamicContent } from 'pdfmake/interfaces';
import { BORDER, MUTED } from './blocks';

/** The brand teal of `@clini/theme`, as a plain value. */
export const BRAND = '#0d7179';

export type InvoiceLetterhead = {
    brandName: string;
    /** The manifest's `logotype.light`, or null when it couldn't be read. */
    logoSvg: string | null;
};

/**
 * Clini's brand atop the voucher: its logotype (or its name, when the
 * logotype couldn't be read) and a rule in the brand teal. The voucher's own
 * fiscal content follows, unchanged.
 */
export function brandBand(letterhead: InvoiceLetterhead): Content {
    return {
        margin: [0, 0, 0, 10],
        stack: [
            letterhead.logoSvg
                ? { svg: letterhead.logoSvg, fit: [96, 28] }
                : {
                      text: letterhead.brandName,
                      bold: true,
                      fontSize: 16,
                      color: BRAND,
                  },
            {
                margin: [0, 6, 0, 0],
                canvas: [
                    {
                        type: 'line',
                        x1: 0,
                        y1: 0,
                        x2: 515,
                        y2: 0,
                        lineWidth: 1.5,
                        lineColor: BRAND,
                    },
                ],
            },
        ],
    };
}

/** The brand at the foot of every page, under a light rule. */
export function brandFooter(letterhead: InvoiceLetterhead): DynamicContent {
    return () => ({
        margin: [40, 0, 40, 0],
        stack: [
            {
                canvas: [
                    {
                        type: 'line',
                        x1: 0,
                        y1: 0,
                        x2: 515,
                        y2: 0,
                        lineWidth: 0.5,
                        lineColor: BORDER,
                    },
                ],
            },
            {
                text: letterhead.brandName,
                color: MUTED,
                fontSize: 8,
                alignment: 'right',
                margin: [0, 4, 0, 0],
            },
        ],
    });
}
