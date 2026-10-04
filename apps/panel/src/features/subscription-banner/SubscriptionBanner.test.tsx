import { buildSubscription } from '@/tests/fixtures/subscription';
import type { Subscription } from '@/types/subscription';
import { fireEvent, render, screen } from '@testing-library/react';
import type { MouseEventHandler, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SubscriptionBanner } from './SubscriptionBanner';

vi.mock('@tanstack/react-router', () => ({
    Link: ({
        to,
        hash,
        onClick,
        className,
        children,
    }: {
        to: string;
        hash?: string;
        onClick?: MouseEventHandler<HTMLAnchorElement>;
        className?: string;
        children: ReactNode;
    }) => (
        <a
            href={hash ? `${to}#${hash}` : to}
            className={className}
            onClick={(event) => {
                event.preventDefault();
                onClick?.(event);
            }}
        >
            {children}
        </a>
    ),
}));

function subscription(overrides: Partial<Subscription> = {}): Subscription {
    return buildSubscription(overrides.status ?? 'active', overrides);
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
        ).toBe('/ajustes#suscripcion');
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

    it.each(['grace', 'expired', 'cancelled'] as const)(
        'links a %s subscription to the Suscripción section of Ajustes',
        (status) => {
            render(
                <SubscriptionBanner
                    subscription={subscription({ status, grace_days_left: 2 })}
                />,
            );

            expect(
                screen
                    .getByRole('link', { name: 'Ver suscripción' })
                    .getAttribute('href'),
            ).toBe('/ajustes#suscripcion');
        },
    );

    it('scrolls the section into view when it is already on screen', () => {
        const section = document.createElement('section');
        section.id = 'suscripcion';
        section.scrollIntoView = vi.fn();
        document.body.appendChild(section);

        render(
            <SubscriptionBanner
                subscription={subscription({
                    status: 'expired',
                    restricted: true,
                })}
            />,
        );
        fireEvent.click(screen.getByRole('link', { name: 'Ver suscripción' }));

        expect(section.scrollIntoView).toHaveBeenCalled();
        section.remove();
    });
});
