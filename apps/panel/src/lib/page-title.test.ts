import { describe, expect, it } from 'vitest';
import { pageTitle, titleHead } from './page-title';

describe('pageTitle', () => {
    it('appends the app name to the section', () => {
        expect(pageTitle('Agenda')).toBe('Agenda · Clini');
    });

    it('joins every part from most to least specific', () => {
        expect(pageTitle('Receta', 'Juan Pérez')).toBe(
            'Receta · Juan Pérez · Clini',
        );
    });

    it('drops parts not loaded yet', () => {
        expect(pageTitle(undefined, 'Pacientes')).toBe('Pacientes · Clini');
        expect(pageTitle('Receta', null)).toBe('Receta · Clini');
    });
});

describe('titleHead', () => {
    it('wraps the title as a route head meta entry', () => {
        expect(titleHead('Ajustes')).toEqual({
            meta: [{ title: 'Ajustes · Clini' }],
        });
    });
});
