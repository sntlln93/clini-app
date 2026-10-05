import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import { renderRoute } from '@/tests/render-route';
import type { AdminSubscription } from '@/types/subscription';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExtendGraceDialog } from '../-components/ExtendGraceDialog';
import {
    graceDateBounds,
    graceExtensionSchema,
} from '../-components/grace-schema';

const refresh = vi.fn(() => Promise.resolve());

vi.mock('@/lib/api', () => ({ api: { post: vi.fn() } }));
vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));
vi.mock('@/hooks/use-refresh-page-data', () => ({
    useRefreshPageData: () => refresh,
}));

const SUBSCRIPTION: AdminSubscription = {
    id: 9,
    organization: {
        id: 1,
        name: 'Consultorio Norte',
        slug: 'norte',
        suspended_at: null,
    },
    provider: 'mercadopago',
    provider_subscription_id: 'pre_1',
    status: 'grace',
    restricted: false,
    grace_ends_at: '2026-10-10T02:59:59+00:00',
    grace_days_left: 5,
    grace_reason: 'payment_failed',
    last_payment_at: null,
    last_payment_failed_at: null,
    next_payment_at: null,
    cancelled_at: null,
    created_at: '2026-09-01T12:00:00+00:00',
    updated_at: '2026-10-01T12:00:00+00:00',
};

async function openDialog() {
    await renderRoute(<ExtendGraceDialog subscription={SUBSCRIPTION} />, {
        path: '/suscripciones/9',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Extender gracia' }));
    await screen.findByRole('dialog');
}

describe('grace-schema', () => {
    // 23:30 in Buenos Aires = already Oct 5 in UTC; "today" is still Oct 4.
    const now = new Date('2026-10-05T02:30:00Z');

    it('bounds the date to tomorrow..today+90 in the reporting timezone', () => {
        expect(graceDateBounds(now)).toEqual({
            min: '2026-10-05',
            max: '2027-01-02',
        });
    });

    it('rejects today, accepts tomorrow and rejects past the 90-day window', () => {
        const schema = graceExtensionSchema(now);

        expect(
            schema.safeParse({ grace_ends_on: '2026-10-04', note: '' }).success,
        ).toBe(false);
        expect(
            schema.safeParse({ grace_ends_on: '2026-10-05', note: '' }).success,
        ).toBe(true);
        expect(
            schema.safeParse({ grace_ends_on: '2027-01-03', note: '' }).success,
        ).toBe(false);
    });
});

describe('ExtendGraceDialog', () => {
    it('constrains the native date input to the allowed window', async () => {
        await openDialog();

        const input = screen.getByLabelText(
            'Nueva fecha de fin',
        ) as HTMLInputElement;
        const { min, max } = graceDateBounds();
        expect(input.min).toBe(min);
        expect(input.max).toBe(max);
    });

    describe('across midnight', () => {
        afterEach(() => {
            vi.useRealTimers();
        });

        it('recomputes the bounds when the dialog opens, not once at mount', async () => {
            vi.useFakeTimers({ toFake: ['Date'] });
            // 23:30 in Buenos Aires on Oct 4.
            vi.setSystemTime(new Date('2026-10-05T02:30:00Z'));
            await openDialog();
            const input = () =>
                screen.getByLabelText('Nueva fecha de fin') as HTMLInputElement;
            expect(input().min).toBe('2026-10-05');

            fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
            await waitFor(() =>
                expect(screen.queryByRole('dialog')).toBeNull(),
            );

            // 00:30 on Oct 5: "mañana" is now Oct 6.
            vi.setSystemTime(new Date('2026-10-05T03:30:00Z'));
            fireEvent.click(
                screen.getByRole('button', { name: 'Extender gracia' }),
            );
            await screen.findByRole('dialog');

            expect(input().min).toBe('2026-10-06');
        });

        it('validates against "today" at submit time, for a dialog left open past midnight', async () => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(new Date('2026-10-05T02:30:00Z'));
            await openDialog();
            fireEvent.change(screen.getByLabelText('Nueva fecha de fin'), {
                target: { value: '2026-10-05' },
            });

            vi.setSystemTime(new Date('2026-10-05T03:30:00Z'));
            fireEvent.click(screen.getByRole('button', { name: 'Extender' }));

            await screen.findByText('Elegí una fecha a partir de mañana.');
            expect(api.post).not.toHaveBeenCalled();
        });
    });

    it('sends the date and a trimmed note, then toasts the new end date', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { data: SUBSCRIPTION },
        });
        await openDialog();
        const { min } = graceDateBounds();

        fireEvent.change(screen.getByLabelText('Nueva fecha de fin'), {
            target: { value: min },
        });
        fireEvent.change(screen.getByLabelText('Nota'), {
            target: { value: '  Acordado por soporte  ' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Extender' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/admin/subscriptions/9/grace-extension',
                {
                    grace_ends_on: min,
                    note: 'Acordado por soporte',
                },
            ),
        );
        const [year, month, day] = min.split('-');
        await waitFor(() =>
            expect(notifySuccess).toHaveBeenCalledWith(
                `Período de gracia extendido hasta el ${day}/${month}/${year}`,
            ),
        );
        expect(refresh).toHaveBeenCalledWith(
            ['subscriptions'],
            ['organizations'],
            ['audit-logs'],
            ['overview'],
        );
    });

    it('shows grace_extension_not_later on the date field, not as a general error', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    error: {
                        code: 'subscriptions.grace_extension_not_later',
                        message: 'x',
                        context: {
                            current_grace_ends_at: '2026-10-10T02:59:59+00:00',
                        },
                    },
                },
            },
        });
        await openDialog();

        fireEvent.change(screen.getByLabelText('Nueva fecha de fin'), {
            target: { value: graceDateBounds().min },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Extender' }));

        const message = await screen.findByText(
            'Elegí una fecha posterior al fin de la gracia actual.',
        );
        expect(message.getAttribute('data-slot')).toBe('form-message');
        expect(screen.queryByRole('alert')).toBeNull();
    });
});
