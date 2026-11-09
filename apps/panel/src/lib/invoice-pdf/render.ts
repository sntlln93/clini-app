import { loadBrandLogo } from '@/lib/pdf/brand-logo';
import { loadPdfMake } from '@/lib/pdf/pdfmake';
import { brand } from '@clini/brand';
import { buildInvoiceDocument, type IssuedInvoice } from './document';

/** Builds the PDF of an issued subscription invoice in the browser (ADR 0023), under Clini's brand. */
export async function renderInvoicePdf(invoice: IssuedInvoice): Promise<Blob> {
    const [pdfMake, logoSvg] = await Promise.all([
        loadPdfMake(),
        loadBrandLogo(),
    ]);

    return pdfMake
        .createPdf(
            buildInvoiceDocument(invoice, { brandName: brand.name, logoSvg }),
        )
        .getBlob();
}
