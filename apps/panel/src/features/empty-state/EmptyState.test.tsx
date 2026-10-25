import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
    it('stands in for a page: drawing, heading, description and actions, in its own card', () => {
        const { container } = render(
            <EmptyState
                illustration="patients"
                title="Todavía no hay pacientes"
                description="Cargá el primer paciente para empezar a agendar turnos."
                action={<button type="button">Nuevo paciente</button>}
            />,
        );

        screen.getByRole('heading', {
            level: 2,
            name: 'Todavía no hay pacientes',
        });
        screen.getByText(
            'Cargá el primer paciente para empezar a agendar turnos.',
        );
        screen.getByRole('button', { name: 'Nuevo paciente' });
        const drawing = container.querySelector('svg');
        expect(drawing?.getAttribute('aria-hidden')).toBe('true');
        expect(drawing?.dataset.illustration).toBe('patients');
        expect(container.firstElementChild?.className).toContain('border');
    });

    it('drops the card when the page already wraps it in one', () => {
        const { container } = render(
            <EmptyState
                illustration="agenda_day"
                title="Hoy no tenés turnos"
                framed={false}
            />,
        );

        expect(container.firstElementChild?.className).not.toContain('border');
    });

    it('inside a card, leaves the heading to the card and shows only what it has', () => {
        const { container } = render(
            <EmptyState
                illustration="records"
                title="Sin acciones registradas"
                size="section"
            />,
        );

        expect(screen.queryByRole('heading')).toBeNull();
        screen.getByText('Sin acciones registradas');
        expect(screen.queryByRole('button')).toBeNull();
        expect(container.firstElementChild?.className).not.toContain('border');
    });

    it.each([
        'agenda_day',
        'agenda_week',
        'team',
        'patients',
        'search',
        'records',
        'inbox',
        'organizations',
        'payments',
    ] as const)('draws the %s scene', (illustration) => {
        const { container } = render(
            <EmptyState illustration={illustration} title="Vacío" />,
        );

        const drawing = container.querySelector('svg');
        expect(drawing?.dataset.illustration).toBe(illustration);
        // The glow and the shadow are the frame; the scene adds its own shapes.
        expect(drawing?.querySelectorAll('*').length).toBeGreaterThan(4);
    });
});
