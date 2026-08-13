import { buildProfessional } from '@/tests/fixtures/professional';
import type { Professional } from '@/types/professional';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfessionalPicker } from '../-components/ProfessionalPicker';

const PROFESSIONAL = buildProfessional({ id: 3 });

function renderForm(props: {
    professionals: Professional[];
    selectedId: number | null;
}) {
    render(
        <ProfessionalPicker
            professionals={props.professionals}
            selectedId={props.selectedId}
            onSelect={() => {}}
        />,
    );
}

describe('ProfessionalPicker', () => {
    it("shows the selected professional's name at mount, not the id", () => {
        renderForm({ professionals: [PROFESSIONAL], selectedId: 3 });

        const trigger = screen.getByRole('combobox');
        expect(trigger.textContent).toContain('Dra. Ana López');
        expect(trigger.textContent).not.toContain('3');
    });

    it('shows the placeholder when there is no selected professional', () => {
        renderForm({ professionals: [PROFESSIONAL], selectedId: null });

        expect(screen.getByRole('combobox').textContent).toContain(
            'Seleccioná un profesional',
        );
    });

    it("exposes the select trigger with accessible name 'Profesional'", () => {
        renderForm({ professionals: [PROFESSIONAL], selectedId: null });

        expect(
            screen.getByRole('combobox', { name: 'Profesional' }),
        ).not.toBeNull();
    });

    it('inherits truncation on the select-value slot without any local workaround', () => {
        renderForm({ professionals: [PROFESSIONAL], selectedId: 3 });

        const trigger = screen.getByRole('combobox');
        const valueSlot = trigger.querySelector('[data-slot="select-value"]');

        expect(valueSlot).not.toBeNull();
        expect(valueSlot?.classList.contains('truncate')).toBe(true);
        expect(valueSlot?.classList.contains('flex')).toBe(false);
    });
});
