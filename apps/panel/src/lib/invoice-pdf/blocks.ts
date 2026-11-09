import { formatInvoiceDate } from '@/lib/invoices';
import { formatPriceCents } from '@/lib/price';
import type { InvoiceVoucher } from '@/types/invoice';
import type { Content } from 'pdfmake/interfaces';

// The theme's (`@clini/theme`) colors as plain values: a PDF can't read CSS
// variables. Text, muted text and borders.
export const TEXT = '#1f2933';
export const MUTED = '#52606d';
export const BORDER = '#cbd2d9';

export function money(cents: number): string {
    return formatPriceCents(cents) ?? '';
}

export function field(label: string, value: string): Content {
    return {
        text: [{ text: `${label}: `, bold: true }, value],
        margin: [0, 0, 0, 2],
    };
}

/** A box spanning the page's width, drawn as a one-cell table. */
export function box(
    content: Content,
    margin: [number, number, number, number] = [0, 0, 0, 8],
): Content {
    return {
        margin,
        table: { widths: ['*'], body: [[content]] },
        layout: {
            hLineColor: () => BORDER,
            vLineColor: () => BORDER,
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 8,
            paddingBottom: () => 8,
        },
    };
}

/**
 * The voucher's heading, as ARCA lays it out: the issuer on the left, the
 * letter and its code in the middle, the voucher on the right.
 */
export function heading(voucher: InvoiceVoucher): Content {
    const pointOfSale = String(voucher.point_of_sale).padStart(5, '0');
    const number = String(voucher.number).padStart(8, '0');

    return box({
        columns: [
            {
                width: '*',
                stack: [
                    {
                        text: voucher.issuer.name,
                        bold: true,
                        fontSize: 13,
                        margin: [0, 0, 0, 6],
                    },
                    field('Domicilio comercial', voucher.issuer.address),
                    field(
                        'Condición frente al IVA',
                        voucher.issuer.vat_condition,
                    ),
                ],
            },
            {
                width: 64,
                stack: [
                    {
                        table: {
                            widths: [40],
                            body: [
                                [
                                    {
                                        text: voucher.letter,
                                        fontSize: 26,
                                        bold: true,
                                        alignment: 'center',
                                    },
                                ],
                            ],
                        },
                        layout: {
                            hLineColor: () => TEXT,
                            vLineColor: () => TEXT,
                        },
                        margin: [6, 0, 0, 2],
                    },
                    {
                        text: `COD. ${String(voucher.type_code).padStart(3, '0')}`,
                        fontSize: 7,
                        bold: true,
                        alignment: 'center',
                    },
                ],
            },
            {
                width: '*',
                stack: [
                    { text: 'FACTURA', bold: true, fontSize: 16 },
                    { text: 'ORIGINAL', style: 'muted', margin: [0, 0, 0, 6] },
                    field('Punto de venta', pointOfSale),
                    field('Comp. Nro', number),
                    field(
                        'Fecha de emisión',
                        formatInvoiceDate(voucher.issued_on),
                    ),
                    field('CUIT', voucher.issuer.cuit),
                    field('Ingresos Brutos', voucher.issuer.gross_income),
                    field(
                        'Fecha de inicio de actividades',
                        formatInvoiceDate(voucher.issuer.activity_start),
                    ),
                ],
            },
        ],
        columnGap: 12,
    });
}
