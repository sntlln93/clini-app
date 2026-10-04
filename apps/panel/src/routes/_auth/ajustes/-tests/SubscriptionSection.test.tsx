import { api } from '@/lib/api';
import { navigateToExternalUrl } from '@/lib/external-navigation';
import { notifyError } from '@/lib/toast';
import { buildSubscription } from '@/tests/fixtures/subscription';
import type { Subscription } from '@/types/subscription';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionSection } from '../-components/SubscriptionSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('@/lib/external-navigation', () => ({
    navigateToExternalUrl: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({
    notifyError: vi.fn(),
}));

function subscription(overrides: Partial<Subscription> = {}): Subscription {
    return buildSubscription(overrides.status ?? 'active', overrides);
}

function renderSection(
    value: Subscription | null,
    { isOwner = true, confirmingPayment = false } = {},
) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });

    render(
        <QueryClientProvider client={queryClient}>
            <SubscriptionSection
                subscription={value}
                isOwner={isOwner}
                confirmingPayment={confirmingPayment}
            />
        </QueryClientProvider>,
    );
}

const REDIRECTING = 'Redirigiendo a Mercado Pago…';

describe('SubscriptionSection', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        vi.mocked(navigateToExternalUrl).mockReset();
        vi.mocked(notifyError).mockReset();
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

    it('is the anchor the panel banner links to', () => {
        renderSection(null);

        expect(screen.getByRole('region', { name: 'Suscripción' }).id).toBe(
            'suscripcion',
        );
    });

    it('shows an active subscription with its renewal date and without any checkout action', () => {
        renderSection(
            subscription({ next_payment_at: '2026-11-03T12:00:00+00:00' }),
        );

        expect(screen.getByText('Activa')).not.toBeNull();
        expect(
            screen.getByText(
                'Se renueva automáticamente el 3 de noviembre de 2026',
            ),
        ).not.toBeNull();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('falls back to a plain notice for an active subscription without a renewal date', () => {
        renderSection(subscription());

        expect(screen.getByText('Suscripción activa')).not.toBeNull();
    });

    it('shows the last payment when there is one', () => {
        renderSection(
            subscription({ last_payment_at: '2026-10-03T12:00:00+00:00' }),
        );

        expect(
            screen.getByText('Último pago: 3 de octubre de 2026'),
        ).not.toBeNull();
    });

    it('omits the last payment when there is none', () => {
        renderSection(subscription());

        expect(screen.queryByText(/Último pago/)).toBeNull();
    });

    it('shows a pending subscription waiting for confirmation, with the subscribe action', () => {
        renderSection(subscription({ status: 'pending' }));

        expect(screen.getByText('Pendiente')).not.toBeNull();
        expect(
            screen.getByText('Esperando confirmación del pago'),
        ).not.toBeNull();
        expect(
            screen.getByRole('button', { name: 'Suscribirse' }),
        ).not.toBeNull();
    });

    it('shows the grace period with its days left, its end date and the regularize action', () => {
        renderSection(
            subscription({
                status: 'grace',
                grace_days_left: 3,
                grace_ends_at: '2026-10-06T12:00:00+00:00',
            }),
        );

        expect(screen.getByText('En período de gracia')).not.toBeNull();
        expect(
            screen.getByText(
                'Pago pendiente: te quedan 3 días (hasta el 6 de octubre de 2026)',
            ),
        ).not.toBeNull();
        expect(
            screen.getByRole('button', { name: 'Regularizar pago' }),
        ).not.toBeNull();
    });

    it('uses the singular for a single day left', () => {
        renderSection(
            subscription({
                status: 'grace',
                grace_days_left: 1,
                grace_ends_at: '2026-10-04T12:00:00+00:00',
            }),
        );

        expect(
            screen.getByText(
                'Pago pendiente: te queda 1 día (hasta el 4 de octubre de 2026)',
            ),
        ).not.toBeNull();
    });

    it.each([
        [
            'expired',
            { grace_ends_at: '2026-10-10T12:00:00+00:00' },
            'Vencida',
            'Venció el 10 de octubre de 2026',
            'Regularizar pago',
        ],
        [
            'expired without a grace end',
            {},
            'Vencida',
            'Suscripción vencida',
            'Regularizar pago',
        ],
        [
            'cancelled',
            { cancelled_at: '2026-10-12T12:00:00+00:00' },
            'Cancelada',
            'Cancelada el 12 de octubre de 2026',
            'Suscribirse',
        ],
    ] as const)(
        'shows a %s subscription as read-only, dated',
        (label, overrides, badge, detail, action) => {
            const status = label.startsWith('expired')
                ? 'expired'
                : 'cancelled';
            renderSection(
                subscription({ status, restricted: true, ...overrides }),
            );

            expect(screen.getByText(badge)).not.toBeNull();
            expect(screen.getByText(detail)).not.toBeNull();
            expect(
                screen.getByText(
                    'La agenda está en modo solo lectura hasta que se registre el pago.',
                ),
            ).not.toBeNull();
            expect(screen.getByRole('button', { name: action })).not.toBeNull();
        },
    );

    it('never offers the checkout to a non-owner', () => {
        renderSection(subscription({ status: 'expired', restricted: true }), {
            isOwner: false,
        });

        expect(screen.queryByRole('button')).toBeNull();
        expect(
            screen.getByText(
                'Solo la persona dueña del consultorio puede gestionar la suscripción.',
            ),
        ).not.toBeNull();
    });

    it('announces the pending confirmation after returning from the checkout', () => {
        renderSection(subscription({ status: 'pending' }), {
            confirmingPayment: true,
        });

        expect(screen.getByRole('status').textContent).toBe(
            'Estamos confirmando tu pago con Mercado Pago…',
        );
    });

    it('shows no confirmation notice otherwise', () => {
        renderSection(subscription({ status: 'pending' }));

        expect(
            screen.queryByText('Estamos confirmando tu pago con Mercado Pago…'),
        ).toBeNull();
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

    it('disables the button with a spinner while the checkout starts, and keeps it so after redirecting', async () => {
        let resolvePost: (value: unknown) => void = () => {};
        vi.mocked(api.post).mockReturnValue(
            new Promise((resolve) => {
                resolvePost = resolve;
            }),
        );
        renderSection(null);

        fireEvent.click(screen.getByRole('button', { name: 'Suscribirse' }));

        const button = await screen.findByRole('button', { name: REDIRECTING });
        expect(button.hasAttribute('disabled')).toBe(true);
        expect(button.querySelector('[data-slot="spinner"]')).not.toBeNull();

        await act(async () => {
            resolvePost({
                data: { data: { init_point: 'https://mp.example/checkout/2' } },
            });
        });

        expect(navigateToExternalUrl).toHaveBeenCalledWith(
            'https://mp.example/checkout/2',
        );
        const stillPending = screen.getByRole('button', { name: REDIRECTING });
        expect(stillPending.hasAttribute('disabled')).toBe(true);
    });

    it('re-enables the button and reports the error when the checkout cannot start', async () => {
        vi.mocked(api.post).mockRejectedValue(new Error('network'));
        renderSection(subscription({ status: 'grace', grace_days_left: 2 }));

        fireEvent.click(
            screen.getByRole('button', { name: 'Regularizar pago' }),
        );

        await waitFor(() => expect(notifyError).toHaveBeenCalled());
        const button = await screen.findByRole('button', {
            name: 'Regularizar pago',
        });
        expect(button.hasAttribute('disabled')).toBe(false);
        expect(button.querySelector('[data-slot="spinner"]')).toBeNull();
        expect(navigateToExternalUrl).not.toHaveBeenCalled();
    });
});
