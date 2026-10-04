import { describe, expect, it } from 'vitest';
import { buildBreadcrumbs } from './breadcrumbs';

describe('buildBreadcrumbs', () => {
    it('returns a single "Agenda" crumb with no href for the root path', () => {
        expect(buildBreadcrumbs('/')).toEqual([{ label: 'Agenda' }]);
    });

    it('does not duplicate the root crumb when the section is the agenda', () => {
        expect(buildBreadcrumbs('/agenda')).toEqual([{ label: 'Agenda' }]);
    });

    it('starts every other section with Agenda linked to /agenda', () => {
        expect(buildBreadcrumbs('/sala-de-espera')).toEqual([
            { label: 'Agenda', href: '/agenda' },
            { label: 'Sala de espera' },
        ]);
    });

    it('prefers the pacientes-section copy for the trailing "nuevo" segment', () => {
        expect(buildBreadcrumbs('/pacientes/nuevo')).toEqual([
            { label: 'Agenda', href: '/agenda' },
            { label: 'Pacientes', href: '/pacientes' },
            { label: 'Nuevo paciente' },
        ]);
    });

    it('links Pacientes back to the list from the patient record', () => {
        expect(buildBreadcrumbs('/pacientes/12')).toEqual([
            { label: 'Agenda', href: '/agenda' },
            { label: 'Pacientes', href: '/pacientes' },
            { label: 'Ficha' },
        ]);
    });

    it('adds a "Ficha" crumb linked to the patient record when editing it', () => {
        expect(buildBreadcrumbs('/pacientes/42/editar')).toEqual([
            { label: 'Agenda', href: '/agenda' },
            { label: 'Pacientes', href: '/pacientes' },
            { label: 'Ficha', href: '/pacientes/42' },
            { label: 'Editar paciente' },
        ]);
    });

    it('uses the member copy for profesionales/nuevo', () => {
        expect(buildBreadcrumbs('/profesionales/nuevo')).toEqual([
            { label: 'Agenda', href: '/agenda' },
            { label: 'Profesionales', href: '/profesionales' },
            { label: 'Invitar miembro' },
        ]);
    });

    it('skips the id in profesionales, which has no detail route', () => {
        expect(buildBreadcrumbs('/profesionales/5/editar')).toEqual([
            { label: 'Agenda', href: '/agenda' },
            { label: 'Profesionales', href: '/profesionales' },
            { label: 'Editar miembro' },
        ]);
    });

    it('never links Recetas, which has no list route', () => {
        expect(buildBreadcrumbs('/recetas/3')).toEqual([
            { label: 'Agenda', href: '/agenda' },
            { label: 'Recetas' },
        ]);
    });

    it('treats a trailing slash the same as no trailing slash', () => {
        const crumbs = buildBreadcrumbs('/ajustes/');

        expect(crumbs).toHaveLength(2);
        expect(crumbs[crumbs.length - 1]).toEqual({ label: 'Ajustes' });
    });

    it('returns a single "Agenda" crumb with no href for an empty pathname', () => {
        expect(buildBreadcrumbs('')).toEqual([{ label: 'Agenda' }]);
    });

    it('falls back to a capitalized label for an unknown segment', () => {
        const crumbs = buildBreadcrumbs('/reportes');

        expect(crumbs[crumbs.length - 1]).toEqual({ label: 'Reportes' });
    });

    it('uses the generic "Nuevo" label outside the sections with their own copy', () => {
        const crumbs = buildBreadcrumbs('/agenda/nuevo');

        expect(crumbs).toEqual([
            { label: 'Agenda', href: '/agenda' },
            { label: 'Nuevo' },
        ]);
    });

    it('does not mutate the shared root crumb across calls', () => {
        buildBreadcrumbs('/12');

        expect(buildBreadcrumbs('/ajustes')[0]).toEqual({
            label: 'Agenda',
            href: '/agenda',
        });
    });
});
