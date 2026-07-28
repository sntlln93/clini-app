import { describe, expect, it } from 'vitest';
import { buildBreadcrumbs } from './breadcrumbs';

describe('buildBreadcrumbs', () => {
    it('returns a single "Inicio" crumb with no href for the root path', () => {
        expect(buildBreadcrumbs('/')).toEqual([{ label: 'Inicio' }]);
    });

    it('returns Inicio linked to / followed by the current section', () => {
        expect(buildBreadcrumbs('/agenda')).toEqual([
            { label: 'Inicio', href: '/' },
            { label: 'Agenda' },
        ]);
    });

    it('prefers the pacientes-section copy for the trailing "nuevo" segment', () => {
        expect(buildBreadcrumbs('/pacientes/nuevo')).toEqual([
            { label: 'Inicio', href: '/' },
            { label: 'Pacientes', href: '/pacientes' },
            { label: 'Nuevo paciente' },
        ]);
    });

    it('skips the numeric id segment, producing exactly 3 crumbs', () => {
        const crumbs = buildBreadcrumbs('/pacientes/42/editar');

        expect(crumbs).toHaveLength(3);
        expect(crumbs).toEqual([
            { label: 'Inicio', href: '/' },
            { label: 'Pacientes', href: '/pacientes' },
            { label: 'Editar paciente' },
        ]);
    });

    it('treats a trailing slash the same as no trailing slash', () => {
        const crumbs = buildBreadcrumbs('/ajustes/');

        expect(crumbs).toHaveLength(2);
        expect(crumbs[crumbs.length - 1]).toEqual({ label: 'Ajustes' });
    });

    it('returns a single "Inicio" crumb with no href for an empty pathname', () => {
        expect(buildBreadcrumbs('')).toEqual([{ label: 'Inicio' }]);
    });

    it('falls back to a capitalized label for an unknown segment', () => {
        const crumbs = buildBreadcrumbs('/reportes');

        expect(crumbs[crumbs.length - 1]).toEqual({ label: 'Reportes' });
    });

    it('uses the generic "Nuevo" label outside the pacientes section', () => {
        const crumbs = buildBreadcrumbs('/agenda/nuevo');

        expect(crumbs[crumbs.length - 1]).toEqual({ label: 'Nuevo' });
    });
});
