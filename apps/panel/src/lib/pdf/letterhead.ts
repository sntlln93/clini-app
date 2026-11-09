import type { Content } from 'pdfmake/interfaces';
import { PDF_COLORS } from './theme';

/** Clini's brand as a PDF of the panel draws it, read from the manifest. */
export type Letterhead = {
    brandName: string;
    /** The manifest's `logotype.light`, or null when it couldn't be read. */
    logoSvg: string | null;
};

/**
 * Clini's logotype, fit to a box, or its name in the brand's teal when the
 * logotype couldn't be read: the PDF is downloaded either way.
 */
export function brandMark(
    letterhead: Letterhead,
    fit: [number, number],
    fontSize: number,
): Content {
    return letterhead.logoSvg
        ? { svg: letterhead.logoSvg, fit }
        : {
              text: letterhead.brandName,
              bold: true,
              fontSize,
              color: PDF_COLORS.primary,
          };
}
