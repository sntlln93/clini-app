import type { BookingProfessional } from '@/types/booking';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});
