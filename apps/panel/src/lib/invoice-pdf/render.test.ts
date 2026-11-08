import { buildInvoice } from '@/tests/fixtures/invoice';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isIssued } from './document';
import { renderInvoicePdf } from './render';

const pdfMake = vi.hoisted(() => ({
    addVirtualFileSystem: vi.fn(),
    createPdf: vi.fn(),
}));

vi.mock('pdfmake/build/pdfmake', () => ({ default: pdfMake }));
vi.mock('pdfmake/build/vfs_fonts', () => ({ default: { 'Roboto.ttf': '' } }));

describe('renderInvoicePdf', () => {
    afterEach(() => vi.clearAllMocks());

    it('draws the invoice with pdfmake and its fonts, loaded on demand', async () => {
        const pdf = new Blob(['%PDF-'], { type: 'application/pdf' });
        pdfMake.createPdf.mockReturnValue({
            getBlob: () => Promise.resolve(pdf),
        });
        const invoice = buildInvoice();

        if (!isIssued(invoice)) {
            throw new Error('the fixture is issued');
        }

        await expect(renderInvoicePdf(invoice)).resolves.toBe(pdf);

        expect(pdfMake.addVirtualFileSystem).toHaveBeenCalledWith({
            'Roboto.ttf': '',
        });
        const document = pdfMake.createPdf.mock
            .calls[0][0] as TDocumentDefinitions;
        expect(document.info?.title).toBe('Factura C 00001-00000012');
    });
});
