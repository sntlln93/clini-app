import { formatInvoiceDate } from '@/lib/invoices';
import { cardRow, pill, pillsRight } from '@/lib/pdf/blocks';
import { PDF_COLORS } from '@/lib/pdf/theme';
import { formatPriceCents } from '@/lib/price';
import type { InvoiceVoucher } from '@/types/invoice';
import type { Column, Content } from 'pdfmake/interfaces';
import { brandMark, type InvoiceLetterhead } from './branding';

export function money(cents: number): string {
    return formatPriceCents(cents) ?? '';
}

/** A CUIT as ARCA prints one, «20-11111111-2»; anything else as it came. */
export function formatCuit(value: string): string {
    return /^\d{11}$/.test(value)
        ? `${value.slice(0, 2)}-${value.slice(2, 10)}-${value.slice(10)}`
        : value;
}

/** The voucher's number with its point of sale, as ARCA numbers it: «00001-00000012». */
export function voucherNumber(voucher: InvoiceVoucher): string {
    const pointOfSale = String(voucher.point_of_sale).padStart(5, '0');

    return `${pointOfSale}-${String(voucher.number).padStart(8, '0')}`;
}

const LETTER_BOX = 44;
const LETTER_COLUMN = 72;

/** The voucher's letter, centered in its box, over its code. */
function letter(voucher: InvoiceVoucher): Column {
    return {
        width: LETTER_COLUMN,
        stack: [
            {
                canvas: [
                    {
                        type: 'rect',
                        x: (LETTER_COLUMN - LETTER_BOX) / 2,
                        y: 0,
                        w: LETTER_BOX,
                        h: LETTER_BOX,
                        r: 8,
                        lineWidth: 1.5,
                        lineColor: PDF_COLORS.text,
                    },
                ],
            },
            // Drawn over the box, out of the flow.
            {
                text: voucher.letter,
                fontSize: 26,
                bold: true,
                alignment: 'center',
                relativePosition: { x: 0, y: -LETTER_BOX + 5 },
            },
            {
                text: `Cód. ${String(voucher.type_code).padStart(3, '0')}`,
                fontSize: 7.5,
                color: PDF_COLORS.muted,
                alignment: 'center',
                margin: [0, 5, 0, 0],
            },
        ],
    };
}

/**
 * The voucher's heading, as ARCA lays it out: the issuer under Clini's
 * brand on the left, the letter and its code in the middle, the voucher on
 * the right. A voucher outside ARCA's production services says up front that
 * it has no fiscal validity.
 */
export function heading(
    voucher: InvoiceVoucher,
    letterhead: InvoiceLetterhead,
): Content {
    const pills = [pill('Original', 'info')];

    if (!voucher.fiscally_valid) {
        pills.push(pill('Prueba · sin validez fiscal', 'warning'));
    }

    return {
        margin: [0, 0, 0, 20],
        columnGap: 12,
        columns: [
            {
                width: '*',
                stack: [
                    brandMark(letterhead),
                    {
                        text: voucher.issuer.name,
                        bold: true,
                        fontSize: 11,
                        margin: [0, 14, 0, 2],
                    },
                    { text: voucher.issuer.address, color: PDF_COLORS.muted },
                ],
            },
            letter(voucher),
            {
                width: '*',
                alignment: 'right',
                stack: [
                    pillsRight(pills),
                    {
                        text: 'Factura',
                        bold: true,
                        fontSize: 24,
                        margin: [0, 6, 0, 0],
                    },
                    {
                        text: voucherNumber(voucher),
                        bold: true,
                        fontSize: 11,
                    },
                    {
                        text: `Emitida el ${formatInvoiceDate(voucher.issued_on)}`,
                        color: PDF_COLORS.muted,
                        margin: [0, 4, 0, 0],
                    },
                ],
            },
        ],
    };
}

/** A card's title over its label/value rows, the values on the right. */
function party(title: string, rows: [string, string][]): Content {
    return {
        stack: [
            { text: title, bold: true, fontSize: 10.5, margin: [0, 0, 0, 8] },
            {
                table: {
                    widths: ['auto', '*'],
                    body: rows.map(([label, value]) => [
                        { text: label, color: PDF_COLORS.muted },
                        { text: value, alignment: 'right' },
                    ]),
                },
                layout: {
                    hLineWidth: () => 0,
                    vLineWidth: () => 0,
                    paddingLeft: (column: number) => (column === 0 ? 0 : 8),
                    paddingRight: () => 0,
                    paddingTop: () => 2,
                    paddingBottom: () => 2,
                },
            },
        ],
    };
}

/** The issuer's fiscal data and the receiver, always a final consumer: Clini asks for no customer data (#246). */
export function parties(voucher: InvoiceVoucher): Content {
    const { issuer } = voucher;

    return cardRow([
        party('Emisor', [
            ['Condición frente al IVA', issuer.vat_condition],
            ['CUIT', formatCuit(issuer.cuit)],
            ['Ingresos Brutos', formatCuit(issuer.gross_income)],
            ['Inicio de actividades', formatInvoiceDate(issuer.activity_start)],
        ]),
        party('Receptor', [
            ['Nombre', 'Consumidor Final'],
            ['Condición frente al IVA', 'Consumidor Final'],
        ]),
    ]);
}
