import { api } from '@/lib/api';
import { navigateToExternalUrl } from '@/lib/external-navigation';
import type { Subscription } from '@/types/subscription';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionSection } from '../-components/SubscriptionSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('@/lib/external-navigation', () => ({
    navigateToExternalUrl: vi.fn(),
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

function renderSection(value: Subscription | null, isOwner = true) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <SubscriptionSection subscription={value} isOwner={isOwner} />
        </QueryClientProvider>,
    );
}

describe('SubscriptionSection', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
    });

    it('offers the owner to subscribe when the organization never subscribed', () => {
        renderSection(null);

        expect(
            screen.getByText(
                'El consultorio todavía no tiene una suscripción.',
            ),
        ).not.toBeNull();
        expect(
            screen.getByRole('button', { name: 'Suscribirse' }),
        ).not.toBeNull();
    });

    it('shows an active subscription without any checkout action', () => {
        renderSection(subscription());

        expect(screen.getByText('Activa')).not.toBeNull();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('shows a pending subscription with the subscribe action', () => {
        renderSection(subscription({ status: 'pending' }));

        expect(screen.getByText('Pendiente')).not.toBeNull();
        expect(
            screen.getByRole('button', { name: 'Suscribirse' }),
        ).not.toBeNull();
    });

    it('shows the grace period with its days left and the regularize action', () => {
        renderSection(subscription({ status: 'grace', grace_days_left: 3 }));

        expect(screen.getByText('En período de gracia')).not.toBeNull();
        expect(
            screen.getByText('Te quedan 3 días para regularizar el pago.'),
        ).not.toBeNull();
        expect(
            screen.getByRole('button', { name: 'Regularizar pago' }),
        ).not.toBeNull();
    });

    it('uses the singular for a single day left', () => {
        renderSection(subscription({ status: 'grace', grace_days_left: 1 }));

        expect(
            screen.getByText('Te queda 1 día para regularizar el pago.'),
        ).not.toBeNull();
    });

    it.each([
        ['expired', 'Vencida', 'Regularizar pago'],
        ['cancelled', 'Cancelada', 'Suscribirse'],
    ] as const)(
        'shows a %s subscription as read-only',
        (status, label, action) => {
            renderSection(subscription({ status, restricted: true }));

            expect(screen.getByText(label)).not.toBeNull();
            expect(
                screen.getByText(
                    'La agenda está en modo solo lectura hasta que se registre el pago.',
                ),
            ).not.toBeNull();
            expect(screen.getByRole('button', { name: action })).not.toBeNull();
        },
    );

    it('never offers the checkout to a non-owner', () => {
        renderSection(
            subscription({ status: 'expired', restricted: true }),
            false,
        );

        expect(screen.queryByRole('button')).toBeNull();
        expect(
            screen.getByText(
                'Solo la persona dueña del consultorio puede gestionar la suscripción.',
            ),
        ).not.toBeNull();
    });

    it('starts the checkout and redirects to its init_point', async () => {
        vi.mocked(api.post).mockResolvedValue({
            data: { data: { init_point: 'https://mp.example/checkout/1' } },
        });
        renderSection(subscription({ status: 'expired', restricted: true }));

        fireEvent.click(
            screen.getByRole('button', { name: 'Regularizar pago' }),
        );

        await waitFor(() =>
            expect(navigateToExternalUrl).toHaveBeenCalledWith(
                'https://mp.example/checkout/1',
            ),
        );
        expect(api.post).toHaveBeenCalledWith('/subscription');
    });
});
