import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PricingSection } from '../-components/PricingSection';

function consultorioCard() {
    return screen.getByRole('article', { name: 'Consultorio' });
}

describe('PricingSection', () => {
    it('shows monthly prices by default', () => {
        render(<PricingSection />);

        expect(
            screen.getByRole<HTMLInputElement>('radio', { name: 'Mensual' })
                .checked,
        ).toBe(true);
        within(consultorioCard()).getByText(/\$15\.000/);
    });

    it('applies the annual discount when switching to annual', () => {
        render(<PricingSection />);

        fireEvent.click(screen.getByRole('radio', { name: 'Anual' }));

        const card = within(consultorioCard());
        card.getByText(/\$9\.000/);
        card.getByText('Un pago de $108.000 por año. Ahorrás $72.000.');
        screen.getByText(/Un solo pago al año con Mercado Pago/);
    });

    it('marks what the free plan does not include', () => {
        render(<PricingSection />);

        const free = within(screen.getByRole('article', { name: 'Gratis' }));
        expect(free.getAllByText(/No incluye:/)).toHaveLength(2);
    });
});
