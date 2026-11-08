import type { Invoice, InvoiceVoucher } from '@/types/invoice';

/** An issued `GET /subscription/invoices` item, by the fake issuer unless overridden. */
export function buildInvoice(
    overrides: Partial<Invoice> = {},
    voucher: Partial<InvoiceVoucher> = {},
): Invoice {
    return {
        id: 7,
        status: 'issued',
        description: 'Suscripción mensual a Clini, plan Consultorio',
        amount_cents: 1850050,
        currency: 'ARS',
        charged_at: '2026-10-03T13:00:00+00:00',
        service_from: '2026-10-03',
        service_to: '2026-11-02',
        voucher: {
            letter: 'C',
            type_code: 11,
            point_of_sale: 1,
            number: 12,
            formatted_number: 'C 00001-00000012',
            issued_on: '2026-10-03',
            payment_due_on: '2026-10-03',
            cae: '76401234567890',
            cae_expires_on: '2026-10-13',
            qr_url: 'https://www.arca.gob.ar/fe/qr/?p=eyJ2ZXIiOjF9',
            fiscally_valid: true,
            issuer: {
                cuit: '20111111112',
                name: 'Emisor de prueba',
                address: 'Calle Falsa 123, CABA',
                vat_condition: 'Responsable Monotributo',
                gross_income: '20111111112',
                activity_start: '2026-01-01',
            },
            ...voucher,
        },
        ...overrides,
    };
}

/** A pending one: ARCA hasn't authorized it yet. */
export function buildPendingInvoice(overrides: Partial<Invoice> = {}): Invoice {
    return buildInvoice({
        id: 8,
        status: 'pending',
        voucher: null,
        ...overrides,
    });
}
