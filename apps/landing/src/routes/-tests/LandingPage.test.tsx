import { expectNoA11yViolations } from '@/tests/a11y';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LandingPage } from '../-components/LandingPage';

describe('LandingPage', () => {
    it('links the calls to action to the panel', () => {
        render(<LandingPage />);

        expect(
            screen.getByRole('link', { name: 'Ingresar' }).getAttribute('href'),
        ).toMatch(/\/login$/);
        for (const link of screen.getAllByRole('link', {
            name: 'Empezar gratis',
        })) {
            expect(link.getAttribute('href')).toMatch(/\/registro$/);
        }
    });

    it('shows every appointment status in the agenda legend', () => {
        render(<LandingPage />);

        const legend = screen.getByRole('figure').querySelector('figcaption');
        for (const label of [
            'Agendado',
            'Confirmado',
            'Llegó',
            'Completado',
            'Ausente',
            'Reserva online',
        ]) {
            expect(legend?.textContent).toContain(label);
        }
    });

    it('has no detectable a11y violations', async () => {
        const { container } = render(<LandingPage />);

        await expectNoA11yViolations(container, {
            skip: [
                {
                    id: 'color-contrast',
                    reason: 'jsdom does not render pixels, so contrast cannot be computed.',
                },
            ],
        });
    });
});
