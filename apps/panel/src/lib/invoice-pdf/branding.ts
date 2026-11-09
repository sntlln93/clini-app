import { PDF_COLORS } from '@/lib/pdf/theme';
import type { Content, DynamicContent } from 'pdfmake/interfaces';

export type InvoiceLetterhead = {
    brandName: string;
    /** The manifest's `logotype.light`, or null when it couldn't be read. */
    logoSvg: string | null;
};

/** Clini's logotype atop the issuer, or its name when the logotype couldn't be read. */
export function brandMark(letterhead: InvoiceLetterhead): Content {
    return letterhead.logoSvg
        ? { svg: letterhead.logoSvg, fit: [110, 32] }
        : {
              text: letterhead.brandName,
              bold: true,
              fontSize: 18,
              color: PDF_COLORS.primary,
          };
}

/** Every page's foot: where the invoices are in the panel, and the page. */
export const invoiceFooter: DynamicContent = (currentPage, pageCount) => ({
    margin: [40, 12, 40, 0],
    fontSize: 8,
    color: PDF_COLORS.muted,
    columns: [
        { text: 'Tus facturas están en Ajustes › Plan y suscripción.' },
        {
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: 'right',
            width: 'auto',
        },
    ],
});
