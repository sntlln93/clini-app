export type InvoiceStatus = 'pending' | 'issued';

/** The issuer's fiscal data, as the voucher printed it when it was issued. */
export type InvoiceIssuer = {
    cuit: string;
    name: string;
    address: string;
    vat_condition: string;
    gross_income: string;
    /** YYYY-MM-DD. */
    activity_start: string;
};

/** What ARCA authorized: null while the invoice is pending. */
export type InvoiceVoucher = {
    letter: string;
    /** ARCA's voucher type code (11: factura C). */
    type_code: number;
    point_of_sale: number;
    number: number;
    /** e.g. «C 00001-00000012». */
    formatted_number: string;
    /** Calendar dates (YYYY-MM-DD) in Argentina. */
    issued_on: string;
    payment_due_on: string;
    cae: string;
    cae_expires_on: string;
    /** RG 4892's QR: ARCA's URL that checks the voucher. */
    qr_url: string;
    /** Only a voucher ARCA's production services authorized is a real one. */
    fiscally_valid: boolean;
    issuer: InvoiceIssuer;
};

/** One of GET /subscription/invoices' items (#246): the invoice of one subscription charge, to a final consumer. */
export type Invoice = {
    id: number;
    status: InvoiceStatus;
    description: string;
    amount_cents: number;
    currency: string;
    /** The charge, an instant. */
    charged_at: string;
    /** The period the charge covers, calendar dates (YYYY-MM-DD). */
    service_from: string;
    service_to: string;
    /**
     * The annual discount an annual charge got, printed under its line; null
     * when monthly, or when the charge isn't the discounted price.
     */
    annual_discount_percent: number | null;
    voucher: InvoiceVoucher | null;
};
