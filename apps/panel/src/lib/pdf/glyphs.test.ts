import { describe, expect, it } from 'vitest';
import { FALLBACK_FONT, outfitDraws, withFallbackFont } from './glyphs';

describe('outfitDraws', () => {
    it('draws Spanish, the PDFs’ punctuation and the euro', () => {
        expect(outfitDraws('Ñandú «¿Qué?» – 24,7 kg/m² · 36,8 °C € µg')).toBe(
            true,
        );
    });

    it('can’t draw what its Latin cut leaves out', () => {
        expect(outfitDraws('PA ≥ 140')).toBe(false);
        expect(outfitDraws('β-bloqueante')).toBe(false);
    });
});

describe('withFallbackFont', () => {
    it('sets in the fallback only the texts Outfit can’t draw, at any depth', () => {
        const content = withFallbackFont({
            stack: [
                'Control',
                { text: 'PA ≥ 140' },
                { text: ['Dosis ', 'β2 ', { text: 'agonista' }] },
                {
                    table: {
                        body: [[{ text: 'α' }, 'ok']],
                    },
                },
                { columns: [{ text: 'Ω', font: 'Outfit' }] },
            ],
        });

        expect(content).toEqual({
            stack: [
                'Control',
                { text: 'PA ≥ 140', font: FALLBACK_FONT },
                {
                    text: [
                        'Dosis ',
                        { text: 'β2 ', font: FALLBACK_FONT },
                        { text: 'agonista' },
                    ],
                },
                {
                    table: {
                        body: [[{ text: 'α', font: FALLBACK_FONT }, 'ok']],
                    },
                },
                // A font set on purpose stays.
                { columns: [{ text: 'Ω', font: 'Outfit' }] },
            ],
        });
    });
});
