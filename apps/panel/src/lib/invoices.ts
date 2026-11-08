import { api } from '@/lib/api';
import { fromCalendarDate } from '@/lib/datetime';
import type { Invoice } from '@/types/invoice';
import { queryOptions } from '@tanstack/react-query';

/** The subscription's invoices (#246), newest charge first; the owner's only. */
export const invoicesQueryOptions = queryOptions({
    queryKey: ['subscription', 'invoices'],
    queryFn: () =>
        api
            .get<{ data: Invoice[] }>('/subscription/invoices')
            .then((response) => response.data.data),
    staleTime: 5 * 60 * 1000,
});

/** A voucher's calendar date (YYYY-MM-DD) as invoices print it: «03/10/2026». */
export function formatInvoiceDate(isoDate: string): string {
    return fromCalendarDate(isoDate).toFormat('dd/LL/yyyy');
}

/** The file a voucher downloads as: its number alone, e.g. `factura-C-00001-00000012.pdf`. */
export function invoiceFilename(invoice: Invoice): string {
    const number = invoice.voucher?.formatted_number ?? String(invoice.id);

    return `factura-${number.replace(' ', '-')}.pdf`;
}
