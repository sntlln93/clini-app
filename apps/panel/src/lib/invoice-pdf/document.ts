import { formatInvoiceDate } from '@/lib/invoices';
import { band, card, fact } from '@/lib/pdf/blocks';
import { PDF_COLORS, PDF_FONT } from '@/lib/pdf/theme';
import type { Invoice, InvoiceVoucher } from '@/types/invoice';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { heading, parties } from './blocks';
import { invoiceFooter, type InvoiceLetterhead } from './branding';
import { detail } from './detail';

const MARGIN = 40;

/** An issued invoice: what the PDF prints. */
export type IssuedInvoice = Invoice & { voucher: InvoiceVoucher };

export function isIssued(invoice: Invoice): invoice is IssuedInvoice {
    return invoice.voucher !== null;
}

/** The period billed, with the year, and when payment was due. */
function period(invoice: IssuedInvoice): Content {
    return band([
        fact(
            'Período facturado desde',
            formatInvoiceDate(invoice.service_from),
        ),
        fact('Hasta', formatInvoiceDate(invoice.service_to)),
        fact(
            'Vencimiento del pago',
            formatInvoiceDate(invoice.voucher.payment_due_on),
        ),
    ]);
}

/** The QR of RG 4892, with the CAE that authorizes the voucher. */
function authorization(voucher: InvoiceVoucher): Content {
    const muted = { color: PDF_COLORS.muted };

    return card(
        {
            columnGap: 14,
            columns: [
                { width: 84, qr: voucher.qr_url, fit: 84, eccLevel: 'M' },
                {
                    width: '*',
                    margin: [0, 12, 0, 0],
                    stack: [
                        {
                            text: 'Comprobante autorizado por ARCA',
                            bold: true,
                            fontSize: 10.5,
                        },
                        {
                            margin: [0, 6, 0, 0],
                            text: [
                                { text: 'CAE ', ...muted },
                                { text: voucher.cae, bold: true },
                                {
                                    text: '      Vencimiento del CAE ',
                                    ...muted,
                                },
                                {
                                    text: formatInvoiceDate(
                                        voucher.cae_expires_on,
                                    ),
                                    bold: true,
                                },
                            ],
                        },
                        {
                            text: 'Escaneá el código para verificar este comprobante en ARCA.',
                            fontSize: 8,
                            margin: [0, 6, 0, 0],
                            ...muted,
                        },
                    ],
                },
            ],
        },
        [0, 8, 0, 0],
    );
}

/**
 * The PDF of an issued subscription invoice (#246, #431): a factura C to a
 * final consumer, with everything ARCA requires printed, built in the
 * browser from what the API answers (ADR 0023), in the theme's colors and
 * typeface, under Clini's brand.
 */
export function buildInvoiceDocument(
    invoice: IssuedInvoice,
    letterhead: InvoiceLetterhead,
): TDocumentDefinitions {
    const { voucher } = invoice;

    return {
        pageSize: 'A4',
        pageMargins: [MARGIN, MARGIN, MARGIN, MARGIN + 8],
        info: {
            title: `Factura ${voucher.formatted_number}`,
            author: voucher.issuer.name,
            creator: letterhead.brandName,
            producer: letterhead.brandName,
        },
        defaultStyle: {
            font: PDF_FONT,
            fontSize: 9,
            color: PDF_COLORS.text,
            lineHeight: 1.2,
        },
        footer: invoiceFooter,
        content: [
            heading(voucher, letterhead),
            parties(voucher),
            period(invoice),
            detail(invoice),
            authorization(voucher),
        ],
    };
}
