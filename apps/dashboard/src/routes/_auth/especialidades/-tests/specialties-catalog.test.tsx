import { expectNoA11yViolations } from '@/tests/a11y';
import type { CatalogProfession } from '@/types/specialty';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpecialtiesCatalog } from '../-components/SpecialtiesCatalog';
import { Route } from '../index';

const NO_REASONS = { not_found: 0, inactive: 0, sanctioned: 0, not_enabled: 0 };

const MEDICO: CatalogProfession = {
    profession: 'medico',
    licenses: {
        verified: 1250,
        unverified: 3,
        mismatch: 3,
        mismatch_reasons: { ...NO_REASONS, not_found: 1, inactive: 2 },
    },
    specialties: [
        {
            id: 1,
            name: 'Médico',
            without_specialty: true,
            backed_professionals: 4,
            offering_professionals: 2,
            offering_organizations: 1,
            unbacked_offers: 0,
        },
        {
            id: 2,
            name: 'Cardiología',
            without_specialty: false,
            backed_professionals: 7,
            offering_professionals: 5,
            offering_organizations: 3,
            unbacked_offers: 2,
        },
    ],
};

const KINESIOLOGO: CatalogProfession = {
    profession: 'kinesiologo',
    licenses: {
        verified: 0,
        unverified: 1,
        mismatch: 0,
        mismatch_reasons: NO_REASONS,
    },
    specialties: [],
};

const normalize = (text: string | null) => text?.replace(/\s/g, ' ');

function card(title: string): HTMLElement {
    const heading = [
        ...document.querySelectorAll('[data-slot="card-title"]'),
    ].find((element) => element.textContent === title);

    return heading?.closest('[data-slot="card"]') as HTMLElement;
}

describe('SpecialtiesCatalog', () => {
    it('explains how the catalog fills while it is empty', () => {
        render(
            <SpecialtiesCatalog
                usage={{ professions: [] }}
                query=""
                onClearSearch={vi.fn()}
            />,
        );

        screen.getByRole('heading', { name: 'Todavía no hay especialidades' });
        screen.getByText(/registro nacional de profesionales/);
    });

    it('says nothing matched a search, and offers to clear it', () => {
        const onClearSearch = vi.fn();
        render(
            <SpecialtiesCatalog
                usage={{ professions: [] }}
                query="trauma"
                onClearSearch={onClearSearch}
            />,
        );

        screen.getByRole('heading', { name: 'Sin resultados' });
        expect(screen.queryByText('Todavía no hay especialidades')).toBeNull();
        fireEvent.click(
            screen.getByRole('button', { name: 'Limpiar búsqueda' }),
        );
        expect(onClearSearch).toHaveBeenCalledOnce();
    });

    it('groups the catalog by profession with its license counts', () => {
        render(
            <SpecialtiesCatalog
                usage={{ professions: [MEDICO, KINESIOLOGO] }}
                query=""
                onClearSearch={vi.fn()}
            />,
        );

        const medico = card('Médico');
        expect(normalize(medico.textContent)).toContain('1.250 verificadas');
        expect(medico.textContent).toContain('3 sin verificar');
        expect(medico.textContent).toContain('3 no coinciden');
        const reasons = within(medico).getByRole('list', {
            name: 'Motivos por los que no coinciden',
        });
        expect(
            within(reasons)
                .getAllByRole('listitem')
                .map((item) => item.textContent),
        ).toEqual(['No figura en el registro: 1', 'Profesional inactivo: 2']);

        const kinesiologo = card('Kinesiólogo');
        expect(
            within(kinesiologo).queryByRole('list', {
                name: 'Motivos por los que no coinciden',
            }),
        ).toBeNull();
        within(kinesiologo).getByText(
            'El registro todavía no respondió especialidades de esta profesión.',
        );
    });

    it('shows each specialty with its counts, the profession row marked', () => {
        render(
            <SpecialtiesCatalog
                usage={{ professions: [MEDICO] }}
                query=""
                onClearSearch={vi.fn()}
            />,
        );

        const rows = within(card('Médico')).getAllByRole('row');
        expect(rows.map((row) => normalize(row.textContent))).toEqual([
            'EspecialidadCon respaldoLa ofrecenConsultoriosSin respaldo',
            'MédicoSin especialidad4210',
            'Cardiología7532',
        ]);
    });

    it('has no accessibility violations', async () => {
        const { container } = render(
            <SpecialtiesCatalog
                usage={{ professions: [MEDICO, KINESIOLOGO] }}
                query=""
                onClearSearch={vi.fn()}
            />,
        );

        await expectNoA11yViolations(container);
    });
});

describe('/especialidades route', () => {
    it('reads the catalog for the search through the query cache', async () => {
        const ensureQueryData = vi.fn().mockResolvedValue({ professions: [] });
        const run = Route.options.loader as unknown as (args: {
            context: {
                queryClient: { ensureQueryData: typeof ensureQueryData };
            };
            deps: { q: string };
        }) => Promise<unknown>;

        await expect(
            run({
                context: { queryClient: { ensureQueryData } },
                deps: { q: 'cardio' },
            }),
        ).resolves.toEqual({ professions: [] });
        expect(ensureQueryData).toHaveBeenCalledWith(
            expect.objectContaining({
                queryKey: ['specialties', { q: 'cardio' }],
            }),
        );
    });

    it('keeps a search from the URL and drops a broken one', () => {
        const validate = Route.options.validateSearch as (
            search: Record<string, unknown>,
        ) => { q?: string };

        expect(validate({ q: 'cardio' })).toEqual({ q: 'cardio' });
        expect(validate({ q: 42 })).toEqual({ q: undefined });
        expect(validate({ q: 'a'.repeat(101) })).toEqual({ q: undefined });
    });
});
