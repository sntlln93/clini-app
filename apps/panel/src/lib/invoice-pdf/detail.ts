import { formatInvoiceDate } from '@/lib/invoices';
import { card, pill } from '@/lib/pdf/blocks';
import { PDF_COLORS } from '@/lib/pdf/theme';
import type { Content } from 'pdfmake/interfaces';
import { money } from './blocks';
import type { IssuedInvoice } from './document';

/**
 * What an annual charge saved, «40 % de descuento: ahorraste $ 72.000,00»
 * (#431): the year at list price the API kept less what was charged. Null
 * without both (a monthly charge, or one that wasn't the discounted price),
 * or when an amount isn't an integer a number holds exactly.
 */
export function annualDiscountNote(invoice: IssuedInvoice): string | null {
    const percent = invoice.annual_discount_percent;
    const list = invoice.annual_list_amount_cents;
    const charged = invoice.amount_cents;

    if (
        percent === null ||
        list === null ||
        !Number.isSafeInteger(list) ||
        !Number.isSafeInteger(charged) ||
        list <= charged
    ) {
        return null;
    }

    return `${percent} % de descuento: ahorraste ${money(list - charged)}`;
}

function discountPill(note: string): Content {
    return { margin: [0, 5, 0, 0], stack: [pill(note, 'success')] };
}

/** The line's description, the period it covers and, on an annual charge, what the discount saved. */
function description(invoice: IssuedInvoice): Content {
    const discount = annualDiscountNote(invoice);

    return {
        stack: [
            { text: invoice.description, bold: true },
            {
                text: `Del ${formatInvoiceDate(invoice.service_from)} al ${formatInvoiceDate(invoice.service_to)}`,
                color: PDF_COLORS.muted,
                fontSize: 8,
                margin: [0, 2, 0, 0],
            },
            ...(discount === null ? [] : [discountPill(discount)]),
        ],
    };
}

const HEAD = { bold: true, fontSize: 8.5, color: PDF_COLORS.muted };

function items(invoice: IssuedInvoice): Content {
    const amount = money(invoice.amount_cents);

    return {
        table: {
            headerRows: 1,
            widths: ['*', 36, 80, 80],
            body: [
                [
                    { text: 'Descripción', ...HEAD },
                    { text: 'Cant.', alignment: 'right', ...HEAD },
                    { text: 'Precio unitario', alignment: 'right', ...HEAD },
                    { text: 'Subtotal', alignment: 'right', ...HEAD },
                ],
                [
                    description(invoice),
                    { text: '1', alignment: 'right' },
                    { text: amount, alignment: 'right' },
                    { text: amount, alignment: 'right' },
                ],
            ],
        },
        layout: {
            // A rule under the heading and under the line.
            hLineWidth: (row: number) => (row === 1 || row === 2 ? 0.75 : 0),
            hLineColor: () => PDF_COLORS.border,
            vLineWidth: () => 0,
            paddingLeft: (column: number) => (column === 0 ? 0 : 8),
            paddingRight: () => 0,
            paddingTop: (row: number) => (row === 0 ? 0 : 10),
            paddingBottom: () => 10,
        },
    };
}

function totalRow(label: string, value: string): Content {
    return {
        columns: [
            { text: label, color: PDF_COLORS.muted },
            { text: value, alignment: 'right', width: 'auto' },
        ],
        margin: [0, 0, 0, 5],
    };
}

/** The total on the light teal accent: little ink when printed. */
function total(invoice: IssuedInvoice): Content {
    return {
        margin: [0, 4, 0, 0],
        table: {
            widths: ['*'],
            body: [
                [
                    {
                        columns: [
                            {
                                text: 'Importe total',
                                bold: true,
                                color: PDF_COLORS.primary,
                                margin: [0, 4, 0, 0],
                            },
                            {
                                text: money(invoice.amount_cents),
                                bold: true,
                                fontSize: 16,
                                color: PDF_COLORS.primary,
                                alignment: 'right',
                                width: 'auto',
                            },
                        ],
                    },
                ],
            ],
        },
        layout: {
            fillColor: () => PDF_COLORS.accent,
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 12,
            paddingRight: () => 12,
            paddingTop: () => 8,
            paddingBottom: () => 8,
        },
    };
}

/** The detail card: the line, then the subtotal, other taxes and the total. */
export function detail(invoice: IssuedInvoice): Content {
    return card({
        stack: [
            items(invoice),
            {
                margin: [0, 12, 0, 0],
                columns: [
                    { width: '*', text: '' },
                    {
                        width: 220,
                        stack: [
                            totalRow('Subtotal', money(invoice.amount_cents)),
                            totalRow('Importe otros tributos', money(0)),
                            total(invoice),
                        ],
                    },
                ],
            },
        ],
    });
}
