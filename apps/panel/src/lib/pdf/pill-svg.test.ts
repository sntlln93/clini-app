import { describe, expect, it } from 'vitest';
import { svgPill } from './pill-svg';
import { PDF_FONT } from './theme';

describe('svgPill', () => {
    const colors = { fill: '#eeeeee', text: '#111111' };

    it('draws a rounded pill of the given width, its label centered in the theme’s typeface', () => {
        const pill = svgPill('Agendado', colors, { width: 72 }) as {
            svg: string;
            width: number;
            font: string;
        };

        expect(pill.width).toBe(72);
        expect(pill.font).toBe(PDF_FONT);
        expect(pill.svg).toContain(
            '<rect width="72" height="15" rx="7.5" fill="#eeeeee"/>',
        );
        expect(pill.svg).toContain(
            `x="36" y="10.3" text-anchor="middle" font-family="${PDF_FONT}" font-weight="bold" font-size="8" fill="#111111">Agendado</text>`,
        );
        expect(pill.svg).not.toContain('line-through');
    });

    it('strikes its label through on demand, and escapes it', () => {
        const { svg } = svgPill('A & <b>', colors, {
            width: 40,
            struck: true,
        }) as { svg: string };

        expect(svg).toContain(
            'text-decoration="line-through">A &amp; &lt;b&gt;</text>',
        );
    });
});
