import { loadPdfMake } from '@/lib/pdf/pdfmake';
import { buildInvoice } from '@/tests/fixtures/invoice';
import { describe, expect, it } from 'vitest';
import { buildInvoiceDocument, isIssued, type IssuedInvoice } from './document';

/** A PDF's bytes as Latin-1 text: its dictionaries are plain ASCII. */
function textOf(buffer: Uint8Array): string {
    return Array.from(buffer, (byte) => String.fromCharCode(byte)).join('');
}

function issued(...args: Parameters<typeof buildInvoice>): IssuedInvoice {
    const invoice = buildInvoice(...args);

    if (!isIssued(invoice)) {
        throw new Error('the fixture is issued');
    }

    return invoice;
}

// pdfmake itself, not a mock: the definition has to lay out for real.
describe('the invoice drawn by pdfmake', () => {
    it.each([
        [
            'a monthly invoice with the logotype',
            issued(),
            '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
        ],
        [
            'an annual test voucher without it',
            issued(
                {
                    description: 'Suscripción anual a Clini, plan Consultorio',
                    amount_cents: 10800000,
                    service_to: '2027-10-02',
                    annual_discount_percent: 40,
                    annual_list_amount_cents: 18000000,
                },
                { fiscally_valid: false },
            ),
            null,
        ],
    ])(
        'fits %s on one A4 page, in Outfit',
        async (_, invoice, logoSvg) => {
            const pdfMake = await loadPdfMake();
            const pdf = textOf(
                await pdfMake
                    .createPdf(
                        buildInvoiceDocument(invoice, {
                            brandName: 'Clini',
                            logoSvg,
                        }),
                    )
                    .getBuffer(),
            );

            expect(pdf).toMatch(/\/Type \/Pages\s*\/Count 1\b/);
            expect(pdf).toMatch(/\/MediaBox \[0 0 595\.28 841\.89\]/);
            expect(pdf).toMatch(/\/BaseFont \/[A-Z]{6}\+Outfit-Medium/);
            expect(pdf).not.toContain('Roboto');
        },
        30_000,
    );
});
