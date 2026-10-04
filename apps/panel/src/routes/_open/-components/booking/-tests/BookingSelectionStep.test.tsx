import type { BookingProfessional } from '@/types/booking';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BookingSelectionStep } from '../BookingSelectionStep';

const PROFESSIONAL: BookingProfessional = {
    membership_id: 7,
    name: 'Dra. Ana López',
    specialties: [
        { id: 42, name: 'Cardiología pediátrica avanzada e infantil' },
    ],
    services: [
        {
            id: 3,
            name: 'Consulta',
            duration_minutes: 30,
            price_cents: 1000,
            currency: 'ARS',
        },
    ],
};

function renderStep(specialty?: number) {
    render(
        <BookingSelectionStep
            professionals={[PROFESSIONAL]}
            selection={{ specialty }}
            onChange={() => {}}
        />,
    );
}

function renderWith(
    professionals: BookingProfessional[],
    selection: { specialty?: number; professional?: number; service?: number },
) {
    const onChange = vi.fn();
    render(
        <BookingSelectionStep
            professionals={professionals}
            selection={selection}
            onChange={onChange}
        />,
    );

    return onChange;
}

describe('BookingSelectionStep', () => {
    it("shows the specialty's label, not its numeric id, when a specialty is selected", () => {
        renderStep(42);

        const trigger = screen.getByRole('combobox', { name: 'Especialidad' });
        expect(trigger.textContent).toContain(
            'Cardiología pediátrica avanzada e infantil',
        );
        expect(trigger.textContent).not.toContain('42');
    });

    it('shows the placeholder when there is no selected specialty', () => {
        renderStep(undefined);

        const trigger = screen.getByRole('combobox', { name: 'Especialidad' });
        expect(trigger.textContent).toContain('Todas las especialidades');
    });

    it('lets the select-value slot own truncation, with no local workaround', () => {
        renderStep(42);

        const trigger = screen.getByRole('combobox', { name: 'Especialidad' });
        const valueSlot = trigger.querySelector('[data-slot="select-value"]');

        expect(valueSlot).not.toBeNull();
        expect(valueSlot?.classList.contains('truncate')).toBe(true);
        expect(valueSlot?.classList.contains('flex')).toBe(false);
        expect(valueSlot?.querySelector('span')).toBeNull();
    });

    it("shows the chosen service's duration and price in its label", () => {
        renderWith([PROFESSIONAL], { professional: 7, service: 3 });

        const trigger = screen.getByRole('combobox', { name: 'Prestación' });
        expect(trigger.textContent).toContain(
            'Consulta · 30 min · $\u00a010,00',
        );
    });

    it('leaves the price out of the label of a service with no price', () => {
        renderWith(
            [
                {
                    ...PROFESSIONAL,
                    services: [
                        { ...PROFESSIONAL.services[0], price_cents: null },
                    ],
                },
            ],
            { professional: 7, service: 3 },
        );

        const trigger = screen.getByRole('combobox', { name: 'Prestación' });
        expect(trigger.textContent).toContain('Consulta · 30 min');
        expect(trigger.textContent).not.toContain('$');
    });

    it('explains, instead of showing empty selects, that the practice has no online booking', () => {
        renderWith([], {});

        expect(
            screen.getByText(
                'Este consultorio todavía no tiene turnos disponibles online.',
            ),
        ).not.toBeNull();
        expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('explains that the chosen professional has no services to book online', () => {
        renderWith([{ ...PROFESSIONAL, services: [] }], { professional: 7 });

        expect(
            screen.getByText(
                'Este profesional no tiene prestaciones para reservar online.',
            ),
        ).not.toBeNull();
        expect(
            screen.queryByRole('combobox', { name: 'Prestación' }),
        ).toBeNull();
    });
});
