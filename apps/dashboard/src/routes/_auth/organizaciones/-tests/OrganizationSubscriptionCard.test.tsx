import { renderRoute } from '@/tests/render-route';
import type { AdminSubscription } from '@/types/subscription';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrganizationSubscriptionCard } from '../-components/OrganizationSubscriptionCard';

const SUBSCRIPTION: AdminSubscription = {
    id: 3,
    organization: {
        id: 7,
        name: 'Consultorio Uno',
        slug: 'uno',
        suspended_at: null,
    },
    provider: 'mercadopago',
    provider_subscription_id: 'pre-1',
    status: 'active',
    restricted: false,
    grace_ends_at: null,
    grace_days_left: null,
    grace_reason: null,
    last_payment_at: null,
    last_payment_failed_at: null,
    next_payment_at: null,
    cancelled_at: null,
    access_ends_at: null,
    amount: 25000,
    created_at: '2026-10-01T12:00:00+00:00',
    updated_at: '2026-10-01T12:00:00+00:00',
};

function rowValue(label: string): string {
    return (
        screen.getByText(label).nextElementSibling?.textContent ?? ''
    ).replace(/\s/g, ' ');
}

describe('OrganizationSubscriptionCard', () => {
    it('shows the plan and the monthly amount Mercado Pago charges', async () => {
        await renderRoute(
            <OrganizationSubscriptionCard
                plan="practice"
                assignedPlan={null}
                subscription={SUBSCRIPTION}
            />,
            { path: '/organizaciones/7' },
        );

        expect(rowValue('Plan')).toBe('Consultorio');
        expect(rowValue('Monto mensual')).toBe('$ 25.000');
    });

    it('marks Centro as assigned by Clini, with no subscription', async () => {
        await renderRoute(
            <OrganizationSubscriptionCard
                plan="center"
                assignedPlan="center"
                subscription={null}
            />,
            { path: '/organizaciones/7' },
        );

        expect(rowValue('Plan')).toBe('Centro (asignado por Clini)');
        expect(screen.queryByText('Monto mensual')).toBeNull();
        expect(
            screen.getByText('Esta organización nunca inició una suscripción.'),
        ).not.toBeNull();
    });
});
