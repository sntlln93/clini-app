import { formatDateTime } from '@/lib/format';
import type { AdminSubscription } from '@/types/subscription';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SubscriptionSummaryCard } from '../-components/SubscriptionSummaryCard';

const CANCELLED: AdminSubscription = {
    id: 9,
    organization: {
        id: 1,
        name: 'Consultorio Norte',
        slug: 'norte',
        suspended_at: null,
    },
    provider: 'mercadopago',
    provider_subscription_id: 'pre_1',
    status: 'cancelled',
    restricted: false,
    grace_ends_at: null,
    grace_days_left: null,
    grace_reason: null,
    last_payment_at: '2026-10-03T12:00:00+00:00',
    last_payment_failed_at: null,
    next_payment_at: null,
    cancelled_at: '2026-10-10T12:00:00+00:00',
    access_ends_at: '2026-11-03T12:00:00+00:00',
    amount: null,
    created_at: '2026-09-01T12:00:00+00:00',
    updated_at: '2026-10-10T12:00:00+00:00',
};

function valueOf(label: string): string | null {
    return screen.getByText(label).nextElementSibling?.textContent ?? null;
}

describe('SubscriptionSummaryCard', () => {
    it('shows until when a cancelled subscription keeps write access', () => {
        render(<SubscriptionSummaryCard subscription={CANCELLED} />);

        expect(valueOf('Acceso pago hasta')).toBe(
            formatDateTime('2026-11-03T12:00:00+00:00'),
        );
        expect(valueOf('Escritura')).toBe('Habilitada');
    });

    it('shows no paid access for a cancellation with none left', () => {
        render(
            <SubscriptionSummaryCard
                subscription={{
                    ...CANCELLED,
                    restricted: true,
                    access_ends_at: null,
                }}
            />,
        );

        expect(valueOf('Acceso pago hasta')).toBe(formatDateTime(null));
        expect(valueOf('Escritura')).toBe('Bloqueada (solo lectura)');
    });
});
