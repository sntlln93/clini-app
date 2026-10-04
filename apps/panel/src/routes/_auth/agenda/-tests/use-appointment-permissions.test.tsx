import { sessionQueryOptions } from '@/lib/session';
import { subscriptionQueryOptions } from '@/lib/subscription';
import { buildProfessional } from '@/tests/fixtures/professional';
import { buildSubscription } from '@/tests/fixtures/subscription';
import type { Subscription } from '@/types/subscription';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useAppointmentPermissions } from '../-hooks/use-appointment-permissions';

const OWN_PROFESSIONAL = buildProfessional();

function renderPermissions(subscription: Subscription | null | undefined) {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sessionQueryOptions.queryKey, {
        id: 10,
        name: 'Dra. Ana López',
        email: 'ana@example.com',
        permissions: [
            'appointments.view',
            'appointments.create',
            'appointments.update',
        ],
    });
    if (subscription !== undefined) {
        queryClient.setQueryData(
            subscriptionQueryOptions.queryKey,
            subscription,
        );
    }

    return renderHook(() => useAppointmentPermissions(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        ),
    }).result.current;
}

describe('useAppointmentPermissions under a subscription', () => {
    it.each(['expired', 'cancelled'] as const)(
        'hides appointment writes while %s, keeping reads',
        (status) => {
            const permissions = renderPermissions(buildSubscription(status));

            expect(permissions.canCreate(OWN_PROFESSIONAL)).toBe(false);
            expect(permissions.canUpdate(OWN_PROFESSIONAL)).toBe(false);
            expect(permissions.canView(OWN_PROFESSIONAL)).toBe(true);
        },
    );

    it.each([
        ['no subscription', null],
        ['not loaded', undefined],
        ['pending', buildSubscription('pending')],
        ['active', buildSubscription('active')],
        ['grace', buildSubscription('grace')],
    ])('keeps appointment writes available with %s', (_label, subscription) => {
        const permissions = renderPermissions(subscription);

        expect(permissions.canCreate(OWN_PROFESSIONAL)).toBe(true);
        expect(permissions.canUpdate(OWN_PROFESSIONAL)).toBe(true);
    });
});
