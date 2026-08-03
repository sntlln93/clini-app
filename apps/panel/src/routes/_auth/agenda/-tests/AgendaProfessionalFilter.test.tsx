import type { Membership } from '@/types/membership';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgendaProfessionalFilter } from '../-components/AgendaProfessionalFilter';

function buildMembership(id: number): Membership {
    return {
        id,
        user: {
            id: id + 100,
            name: `Profesional ${id}`,
            email: `profesional-${id}@example.com`,
        },
        roles: ['professional'],
        status: 'active',
        slug: null,
        deleted_at: null,
        created_at: '2026-01-01T00:00:00',
        updated_at: '2026-01-01T00:00:00',
    };
}

function buildProfessionals(count: number): Membership[] {
    return Array.from({ length: count }, (_, index) =>
        buildMembership(index + 1),
    );
}

describe('AgendaProfessionalFilter', () => {
    it('renders one pill button per professional and no dropdown trigger with 4 professionals', () => {
        const professionals = buildProfessionals(4);
        render(
            <AgendaProfessionalFilter
                professionals={professionals}
                selectedIds={professionals.map(
                    (professional) => professional.id,
                )}
                onChange={vi.fn()}
            />,
        );

        expect(screen.getAllByRole('button')).toHaveLength(4);
        expect(screen.queryByText(/Profesionales \(/)).toBeNull();
    });

    it('renders a single dropdown trigger and no pills with 5 professionals, listing 5 checkbox items once opened', async () => {
        const professionals = buildProfessionals(5);
        render(
            <AgendaProfessionalFilter
                professionals={professionals}
                selectedIds={professionals.map(
                    (professional) => professional.id,
                )}
                onChange={vi.fn()}
            />,
        );

        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(1);

        fireEvent.click(buttons[0]);

        expect(await screen.findAllByRole('menuitemcheckbox')).toHaveLength(5);
    });

    it('marks every pill as selected when selectedIds means "all"', () => {
        const professionals = buildProfessionals(3);
        render(
            <AgendaProfessionalFilter
                professionals={professionals}
                selectedIds={professionals.map(
                    (professional) => professional.id,
                )}
                onChange={vi.fn()}
            />,
        );

        screen.getAllByRole('button').forEach((button) => {
            expect(button.getAttribute('aria-pressed')).toBe('true');
        });
    });

    it('clicking a currently selected pill removes that id and keeps the rest', () => {
        const professionals = buildProfessionals(3);
        const onChange = vi.fn();
        render(
            <AgendaProfessionalFilter
                professionals={professionals}
                selectedIds={[1, 2, 3]}
                onChange={onChange}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Profesional 2' }));

        expect(onChange).toHaveBeenCalledWith([1, 3]);
    });

    it('clicking a currently unselected pill adds that id back', () => {
        const professionals = buildProfessionals(3);
        const onChange = vi.fn();
        render(
            <AgendaProfessionalFilter
                professionals={professionals}
                selectedIds={[1, 3]}
                onChange={onChange}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Profesional 2' }));

        expect(onChange).toHaveBeenCalledWith([1, 3, 2]);
    });

    it('toggling one checkbox item in dropdown mode calls onChange with that id removed', async () => {
        const professionals = buildProfessionals(5);
        const onChange = vi.fn();
        render(
            <AgendaProfessionalFilter
                professionals={professionals}
                selectedIds={professionals.map(
                    (professional) => professional.id,
                )}
                onChange={onChange}
            />,
        );

        fireEvent.click(screen.getByRole('button'));

        const item = await screen.findByRole('menuitemcheckbox', {
            name: 'Profesional 2',
        });
        fireEvent.click(item);

        expect(onChange).toHaveBeenCalledWith([1, 3, 4, 5]);
    });
});
