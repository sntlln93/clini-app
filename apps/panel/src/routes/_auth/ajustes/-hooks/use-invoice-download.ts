import { saveFile } from '@/lib/download';
import { isIssued } from '@/lib/invoice-pdf/document';
import { renderInvoicePdf } from '@/lib/invoice-pdf/render';
import { invoiceFilename } from '@/lib/invoices';
import { notifyError } from '@/lib/toast';
import type { Invoice } from '@/types/invoice';
import { useMutation } from '@tanstack/react-query';

/**
 * Draws an issued invoice's PDF and saves it (#246). The API answers the
 * data the list already has, so nothing is fetched; it is a mutation only
 * because the user triggers it.
 */
export function useInvoiceDownload() {
    return useMutation({
        mutationFn: async (invoice: Invoice) => {
            if (!isIssued(invoice)) {
                return;
            }

            saveFile(await renderInvoicePdf(invoice), invoiceFilename(invoice));
        },
        onError: (error) =>
            notifyError(error, 'No se pudo descargar la factura.'),
    });
}
