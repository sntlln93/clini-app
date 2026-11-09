import { formatInvoiceDate } from '@/lib/invoices';
import type { Invoice, InvoiceVoucher } from '@/types/invoice';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { BORDER, box, field, heading, money, MUTED, TEXT } from './blocks';
import { brandBand, brandFooter, type InvoiceLetterhead } from './branding';

const MARGIN = 40;

/** An issued invoice: what the PDF prints. */
export type IssuedInvoice = Invoice & { voucher: InvoiceVoucher };

export function isIssued(invoice: Invoice): invoice is IssuedInvoice {
    return invoice.voucher !== null;
}

function period(invoice: IssuedInvoice): Content {
    return box({
        columns: [
            field(
                'Período facturado desde',
                formatInvoiceDate(invoice.service_from),
            ),
            field('Hasta', formatInvoiceDate(invoice.service_to)),
            field(
                'Fecha de vto. para el pago',
                formatInvoiceDate(invoice.voucher.payment_due_on),
            ),
        ],
        columnGap: 12,
    });
}

/** Always a final consumer: Clini asks for no customer data (#246). */
function receiver(): Content {
    return box({
        stack: [
            field('Condición frente al IVA', 'Consumidor Final'),
            field('Apellido y nombre / Razón social', 'Consumidor Final'),
        ],
    });
}

/** The line's description, with the annual discount it got under it (#246). */
function description(invoice: IssuedInvoice): Content {
    const discount = invoice.annual_discount_percent;

    return discount === null
        ? invoice.description
        : {
              stack: [
                  invoice.description,
                  {
                      text: `Pago anual, con ${discount} % de descuento sobre el precio mensual`,
                      style: 'muted',
                      fontSize: 8,
                      margin: [0, 2, 0, 0],
                  },
              ],
          };
}

function items(invoice: IssuedInvoice): Content {
    const amount = money(invoice.amount_cents);

    return {
        margin: [0, 4, 0, 8],
        table: {
            headerRows: 1,
            widths: ['*', 50, 90, 90],
            body: [
                [
                    { text: 'Descripción', bold: true },
                    { text: 'Cantidad', bold: true, alignment: 'right' },
                    { text: 'Precio unitario', bold: true, alignment: 'right' },
                    { text: 'Subtotal', bold: true, alignment: 'right' },
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
            hLineColor: () => BORDER,
            vLineColor: () => BORDER,
            paddingTop: () => 4,
            paddingBottom: () => 4,
        },
    };
}

function totals(invoice: IssuedInvoice): Content {
    return {
        alignment: 'right',
        margin: [0, 0, 0, 16],
        stack: [
            field('Subtotal', money(invoice.amount_cents)),
            field('Importe otros tributos', money(0)),
            {
                text: `Importe total: ${money(invoice.amount_cents)}`,
                bold: true,
                fontSize: 12,
            },
        ],
    };
}

/** The QR of RG 4892, with the CAE that authorizes the voucher. */
function authorization(voucher: InvoiceVoucher): Content {
    return {
        columns: [
            { width: 96, qr: voucher.qr_url, fit: 96, eccLevel: 'M' },
            {
                width: '*',
                margin: [8, 8, 0, 0],
                stack: [
                    {
                        text: 'Comprobante autorizado por ARCA',
                        bold: true,
                        margin: [0, 0, 0, 6],
                    },
                    field('CAE N°', voucher.cae),
                    field(
                        'Fecha de vto. de CAE',
                        formatInvoiceDate(voucher.cae_expires_on),
                    ),
                ],
            },
        ],
    };
}

/**
 * A voucher from ARCA's homologation services, or from the fake issuer of
 * dev and CI, says so up front: it has no fiscal validity.
 */
function testNotice(voucher: InvoiceVoucher): Content[] {
    return voucher.fiscally_valid
        ? []
        : [
              {
                  text: 'Comprobante de prueba: sin validez fiscal.',
                  bold: true,
                  alignment: 'center',
                  margin: [0, 0, 0, 8],
              },
          ];
}

/**
 * The PDF of an issued subscription invoice (#246): a factura C to a final
 * consumer, with everything ARCA requires printed, built in the browser
 * from what the API answers (ADR 0023), under Clini's brand.
 */
export function buildInvoiceDocument(
    invoice: IssuedInvoice,
    letterhead: InvoiceLetterhead,
): TDocumentDefinitions {
    const { voucher } = invoice;

    return {
        pageSize: 'A4',
        pageMargins: [MARGIN, MARGIN, MARGIN, MARGIN],
        info: {
            title: `Factura ${voucher.formatted_number}`,
            author: voucher.issuer.name,
        },
        defaultStyle: { fontSize: 9, color: TEXT, lineHeight: 1.2 },
        styles: { muted: { color: MUTED } },
        footer: brandFooter(letterhead),
        content: [
            brandBand(letterhead),
            ...testNotice(voucher),
            heading(voucher),
            period(invoice),
            receiver(),
            items(invoice),
            totals(invoice),
            authorization(voucher),
        ],
    };
}
