import type { Subscription } from '@/types/subscription';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SubscriptionBanner } from './SubscriptionBanner';

vi.mock('@tanstack/react-router', () => ({
    Link: ({
        to,
        className,
        children,
    }: {
        to: string;
        className?: string;
        children: ReactNode;
    }) => (
        <a href={to} className={className}>
            {children}
        </a>
    ),
}));

function subscription(overrides: Partial<Subscription> = {}): Subscription {
    return {
        status: 'active',
        restricted: false,
        grace_ends_at: null,
        grace_days_left: null,
        last_payment_at: null,
        last_payment_failed_at: null,
        ...overrides,
    };
}

describe('SubscriptionBanner', () => {
    it.each([
        ['no subscription', null],
        ['not loaded', undefined],
        ['active', subscription()],
        ['pending', subscription({ status: 'pending' })],
    ])('renders nothing for %s', (_label, value) => {
        const { container } = render(
            <SubscriptionBanner subscription={value} />,
        );

        expect(container.innerHTML).toBe('');
    });

    it('warns about the pending payment and the days left during grace', () => {
        render(
            <SubscriptionBanner
                subscription={subscription({
                    status: 'grace',
                    grace_days_left: 5,
                })}
            />,
        );

        expect(screen.getByRole('alert').textContent).toContain(
            'Tu suscripción tiene un pago pendiente.',
        );
        expect(screen.getByRole('alert').textContent).toContain(
            'Te quedan 5 días',
        );
        expect(
            screen
                .getByRole('link', { name: 'Ver suscripción' })
                .getAttribute('href'),
        ).toBe('/ajustes');
    });

    it('uses the singular for the last day of grace', () => {
        render(
            <SubscriptionBanner
                subscription={subscription({
                    status: 'grace',
                    grace_days_left: 1,
                })}
            />,
        );

        expect(screen.getByRole('alert').textContent).toContain(
            'Te queda 1 día',
        );
    });

    it('announces the read-only mode once expired', () => {
        render(
            <SubscriptionBanner
                subscription={subscription({
                    status: 'expired',
                    restricted: true,
                })}
            />,
        );

        expect(screen.getByRole('alert').textContent).toContain(
            'Suscripción vencida: la agenda está en modo solo lectura',
        );
    });

    it('announces the read-only mode once cancelled', () => {
        render(
            <SubscriptionBanner
                subscription={subscription({
                    status: 'cancelled',
                    restricted: true,
                })}
            />,
        );

        expect(screen.getByRole('alert').textContent).toContain(
            'Suscripción cancelada: la agenda está en modo solo lectura',
        );
    });
});
