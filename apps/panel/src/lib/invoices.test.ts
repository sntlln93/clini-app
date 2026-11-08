import { buildInvoice, buildPendingInvoice } from '@/tests/fixtures/invoice';
import { describe, expect, it } from 'vitest';
import { formatInvoiceDate, invoiceFilename } from './invoices';

describe('invoices', () => {
    it('prints a voucher date as invoices do', () => {
        expect(formatInvoiceDate('2026-10-03')).toBe('03/10/2026');
    });

    // The download history keeps the name: only the voucher's number goes in it.
    it('names the file by the voucher number alone', () => {
        expect(invoiceFilename(buildInvoice())).toBe(
            'factura-C-00001-00000012.pdf',
        );
        expect(invoiceFilename(buildPendingInvoice())).toBe('factura-8.pdf');
    });
});
