import { expectNoA11yViolations } from '@/tests/a11y';
import { render, screen, within } from '@testing-library/react';
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

    it('sends the commercial calls to action to the contact form', () => {
        render(<LandingPage />);

        expect(
            screen
                .getByRole('link', { name: 'Coordinar una llamada' })
                .getAttribute('href'),
        ).toBe('/contacto?plan=centro');
        expect(
            screen
                .getByRole('link', { name: 'Hablar con nosotros' })
                .getAttribute('href'),
        ).toBe('/contacto');
    });

    it('roots the header links at the home page, so they work from /contacto too', () => {
        render(<LandingPage />);

        const nav = screen.getByRole('navigation', { name: 'Principal' });
        for (const name of ['Cómo funciona', 'Precio', 'Preguntas']) {
            expect(
                within(nav).getByRole('link', { name }).getAttribute('href'),
            ).toMatch(/^\/#/);
        }
        expect(
            screen
                .getByRole('link', { name: 'Clini, inicio' })
                .getAttribute('href'),
        ).toBe('/#top');
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
