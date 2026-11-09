import { describe, expect, it } from 'vitest';
import { loadPdfMake } from './pdfmake';
import { PDF_COLORS, PDF_FONT } from './theme';

/** A PDF's bytes as Latin-1 text: its dictionaries are plain ASCII. */
function textOf(buffer: Uint8Array): string {
    return Array.from(buffer, (byte) => String.fromCharCode(byte)).join('');
}

describe('loadPdfMake', () => {
    it('embeds the theme’s typeface, regular and medium, in a real PDF', async () => {
        const pdfMake = await loadPdfMake();
        const buffer = await pdfMake
            .createPdf({
                defaultStyle: { font: PDF_FONT, color: PDF_COLORS.text },
                content: [
                    'Período facturado: ¿ñandú? «$ 18.500,50» › Página 1',
                    { text: 'Importe total', bold: true },
                ],
            })
            .getBuffer();
        const pdf = textOf(buffer);

        expect(pdf.startsWith('%PDF-')).toBe(true);
        expect(pdf).toMatch(/\/BaseFont \/[A-Z]{6}\+Outfit-Regular/);
        expect(pdf).toMatch(/\/BaseFont \/[A-Z]{6}\+Outfit-Medium/);
        expect(pdf).not.toContain('Roboto');
    }, 30_000);
});
