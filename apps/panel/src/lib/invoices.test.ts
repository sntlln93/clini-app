import { api } from '@/lib/api';
import { refreshPageData } from '@/lib/page-data';
import { subscriptionQueryOptions } from '@/lib/subscription';
import { buildInvoice, buildPendingInvoice } from '@/tests/fixtures/invoice';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import {
    formatInvoiceDate,
    invoiceFilename,
    invoicesQueryOptions,
} from './invoices';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));

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

    // Back from the checkout, or after a cancellation, the page refreshes the subscription's key only.
    it('refreshes with the subscription, whose key it nests under', async () => {
        const queryClient = new QueryClient();
        vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [] } });
        await queryClient.fetchQuery(invoicesQueryOptions);
        vi.mocked(api.get).mockResolvedValueOnce({
            data: { data: [buildInvoice()] },
        });

        await refreshPageData(
            queryClient,
            { invalidate: () => Promise.resolve() },
            subscriptionQueryOptions.queryKey,
        );

        expect(api.get).toHaveBeenCalledTimes(2);
        expect(queryClient.getQueryData(invoicesQueryOptions.queryKey)).toEqual(
            [buildInvoice()],
        );
    });
});
