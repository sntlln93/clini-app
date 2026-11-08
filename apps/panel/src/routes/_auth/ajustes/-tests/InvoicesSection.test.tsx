import { saveFile } from '@/lib/download';
import { renderInvoicePdf } from '@/lib/invoice-pdf/render';
import { notifyError } from '@/lib/toast';
import { buildInvoice, buildPendingInvoice } from '@/tests/fixtures/invoice';
import type { Invoice } from '@/types/invoice';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoicesSection } from '../-components/InvoicesSection';

vi.mock('@/lib/invoice-pdf/render', () => ({ renderInvoicePdf: vi.fn() }));
vi.mock('@/lib/download', () => ({ saveFile: vi.fn() }));
vi.mock('@/lib/toast', () => ({
    notifyError: vi.fn(),
    notifySuccess: vi.fn(),
}));

function renderSection(invoices: Invoice[]) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });

    render(
        <QueryClientProvider client={queryClient}>
            <InvoicesSection invoices={invoices} />
        </QueryClientProvider>,
    );
}

function plainText(element: HTMLElement): string {
    return (element.textContent ?? '').replace(/\s/g, ' ');
}

describe('InvoicesSection', () => {
    beforeEach(() => vi.clearAllMocks());

    it("lists each charge's voucher, date, period and total", () => {
        renderSection([buildPendingInvoice(), buildInvoice()]);

        const rows = screen.getAllByRole('row');
        expect(plainText(rows[1])).toContain('En emisión');
        expect(within(rows[1]).queryByRole('button')).toBeNull();
        expect(plainText(rows[2])).toContain('Factura C 00001-00000012');
        expect(plainText(rows[2])).toContain('03/10/2026');
        expect(plainText(rows[2])).toContain('03/10/2026 al 02/11/2026');
        expect(plainText(rows[2])).toContain('$ 18.500,50');
    });

    it('downloads an issued invoice as a PDF named by its number', async () => {
        const pdf = new Blob(['%PDF-']);
        vi.mocked(renderInvoicePdf).mockResolvedValue(pdf);
        const invoice = buildInvoice();
        renderSection([invoice]);

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Descargar la factura C 00001-00000012',
            }),
        );

        await waitFor(() =>
            expect(saveFile).toHaveBeenCalledWith(
                pdf,
                'factura-C-00001-00000012.pdf',
            ),
        );
        expect(renderInvoicePdf).toHaveBeenCalledWith(invoice);
    });

    it('says so when the PDF cannot be drawn', async () => {
        vi.mocked(renderInvoicePdf).mockRejectedValue(new Error('pdfmake'));
        renderSection([buildInvoice()]);

        fireEvent.click(
            screen.getByRole('button', { name: /Descargar la factura/ }),
        );

        await waitFor(() =>
            expect(notifyError).toHaveBeenCalledWith(
                expect.any(Error),
                'No se pudo descargar la factura.',
            ),
        );
        expect(saveFile).not.toHaveBeenCalled();
    });

    it('explains where the first invoice comes from when there is none yet', () => {
        renderSection([]);

        screen.getByRole('heading', { name: 'Facturas' });
        screen.getByText(/la primera llega con el primer cobro/);
        expect(screen.queryByRole('table')).toBeNull();
    });
});
