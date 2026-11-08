import { loadPdfMake } from '@/lib/pdf/pdfmake';
import { buildInvoiceDocument, type IssuedInvoice } from './document';

/** Builds the PDF of an issued subscription invoice in the browser (ADR 0023). */
export async function renderInvoicePdf(invoice: IssuedInvoice): Promise<Blob> {
    const pdfMake = await loadPdfMake();

    return pdfMake.createPdf(buildInvoiceDocument(invoice)).getBlob();
}
