import type { Content } from 'pdfmake/interfaces';
import type { ChipColors } from './chip';
import { PDF_FONT } from './theme';

const HEIGHT = 15;
const FONT_SIZE = 8;
// Outfit's cap height is 0.7 em: this baseline centers a capital's height.
const BASELINE = HEIGHT / 2 + (FONT_SIZE * 0.7) / 2;

function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * A rounded pill drawn as one SVG image, as the panel's chips are drawn: a
 * table can't round its corners, and an image never splits across pages.
 * pdfmake sets its text in Outfit (`PDF_FONT`), centered in the given
 * width, which the caller sizes to its longest label.
 */
export function svgPill(
    label: string,
    colors: ChipColors,
    { width, struck = false }: { width: number; struck?: boolean },
): Content {
    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}">`,
        `<rect width="${width}" height="${HEIGHT}" rx="${HEIGHT / 2}" fill="${colors.fill}"/>`,
        `<text x="${width / 2}" y="${BASELINE}" text-anchor="middle" font-family="${PDF_FONT}" font-weight="bold" font-size="${FONT_SIZE}" fill="${colors.text}"${struck ? ' text-decoration="line-through"' : ''}>${escapeXml(label)}</text>`,
        '</svg>',
    ].join('');

    return { svg, width, font: PDF_FONT };
}
