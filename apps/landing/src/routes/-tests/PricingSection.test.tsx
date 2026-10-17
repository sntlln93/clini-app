import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PricingSection } from '../-components/PricingSection';

function consultorioCard() {
    return screen.getByRole('article', { name: 'Consultorio' });
}

describe('PricingSection', () => {
    it('signs up for Consultorio with the plan, so the panel says where to activate it (#286)', () => {
        render(<PricingSection />);

        expect(
            within(consultorioCard())
                .getByRole('link', { name: 'Elegir Consultorio' })
                .getAttribute('href'),
        ).toMatch(/\/registro\?plan=consultorio$/);
    });

    it('shows monthly prices by default', () => {
        render(<PricingSection />);

        expect(
            screen.getByRole<HTMLInputElement>('radio', { name: 'Mensual' })
                .checked,
        ).toBe(true);
        within(consultorioCard()).getByText(/\$15\.000/);
    });

    it('prices Consultorio like the panel charges it: 5 professionals included, then each extra one (#237)', () => {
        render(<PricingSection />);

        const card = within(consultorioCard());
        card.getByText(
            'Incluye 5 profesionales. Cada profesional adicional suma $5.000 por mes.',
        );
        card.getByText('5 profesionales incluidos, sin tope');
    });

    it('applies the annual discount when switching to annual', () => {
        render(<PricingSection />);

        fireEvent.click(screen.getByRole('radio', { name: 'Anual' }));

        const card = within(consultorioCard());
        card.getByText(/\$9\.000/);
        card.getByText('Un pago de $108.000 por año. Ahorrás $72.000.');
        screen.getByText(/Un solo pago al año con Mercado Pago/);
    });

    it('offers the free plan with unlimited appointments, matching the API default (#300)', () => {
        render(<PricingSection />);

        const free = within(screen.getByRole('article', { name: 'Gratis' }));
        free.getByText('Turnos sin límite');
        expect(screen.queryByText(/40 turnos|35 turnos/)).toBeNull();
    });

    it('marks what the free plan does not include', () => {
        render(<PricingSection />);

        const free = within(screen.getByRole('article', { name: 'Gratis' }));
        expect(free.getAllByText(/No incluye:/)).toHaveLength(2);
    });
});
