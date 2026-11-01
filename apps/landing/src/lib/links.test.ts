import { describe, expect, it } from 'vitest';
import { panelHost } from './links';

describe('panelHost', () => {
    it("is the panel URL's host, port included", () => {
        expect(panelHost('https://panel.clini.example')).toBe(
            'panel.clini.example',
        );
        expect(panelHost('http://localhost:5174')).toBe('localhost:5174');
    });

    it('is empty without a valid panel URL', () => {
        expect(panelHost('')).toBe('');
        expect(panelHost('panel')).toBe('');
    });
});
