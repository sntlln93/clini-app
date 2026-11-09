import {
    brandMark as drawBrandMark,
    type Letterhead,
} from '@/lib/pdf/letterhead';
import { PDF_COLORS } from '@/lib/pdf/theme';
import type { Content, DynamicContent } from 'pdfmake/interfaces';

/** Clini's logotype atop the issuer, or its name when the logotype couldn't be read. */
export function brandMark(letterhead: Letterhead): Content {
    return drawBrandMark(letterhead, [110, 32], 18);
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
