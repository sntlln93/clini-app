import { describe, expect, it } from 'vitest';
import { pageTitle, titleHead } from './page-title';

describe('pageTitle', () => {
    it('appends the app name to the section', () => {
        expect(pageTitle('Resumen')).toBe('Resumen · Clini Plataforma');
    });

    it('joins every part from most to least specific', () => {
        expect(pageTitle('Consultorio Norte', 'Organizaciones')).toBe(
            'Consultorio Norte · Organizaciones · Clini Plataforma',
        );
    });

    it('drops parts not loaded yet', () => {
        expect(pageTitle(undefined, 'Usuarios')).toBe(
            'Usuarios · Clini Plataforma',
        );
        expect(pageTitle('Auditoría', null)).toBe(
            'Auditoría · Clini Plataforma',
        );
    });
});

describe('titleHead', () => {
    it('wraps the title as a route head meta entry', () => {
        expect(titleHead('Estadísticas')).toEqual({
            meta: [{ title: 'Estadísticas · Clini Plataforma' }],
        });
    });
});
