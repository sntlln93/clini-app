import { describe, expect, it } from 'vitest';
import { pageTitle, titleHead } from './page-title';

describe('pageTitle', () => {
    it('appends the app name to the section', () => {
        expect(pageTitle('Agenda')).toBe('Agenda · Clini');
    });

    it('joins every part from most to least specific', () => {
        expect(pageTitle('Ficha', 'Juan Pérez')).toBe(
            'Ficha · Juan Pérez · Clini',
        );
    });

    it('drops parts not loaded yet', () => {
        expect(pageTitle(undefined, 'Pacientes')).toBe('Pacientes · Clini');
        expect(pageTitle('Ficha', null)).toBe('Ficha · Clini');
    });
});

describe('titleHead', () => {
    it('wraps the title as a route head meta entry', () => {
        expect(titleHead('Ajustes')).toEqual({
            meta: [{ title: 'Ajustes · Clini' }],
        });
    });
});
