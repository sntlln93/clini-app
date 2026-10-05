import { SubscriptionEventsTable } from '@/features/subscription-events/SubscriptionEventsTable';
import type { SubscriptionEvent } from '@/types/subscription';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const EVENT: SubscriptionEvent = {
    id: 1,
    provider: 'mercadopago',
    notification_id: 'n-123',
    type: 'payment',
    resource_id: 'pay_999',
    subscription_id: 9,
    organization: { id: 1, name: 'Consultorio Norte' },
    payload: { action: 'payment.created', data: { id: 'pay_999' } },
    created_at: '2026-10-04T15:00:00+00:00',
};

describe('SubscriptionEventsTable', () => {
    it('lists each provider event with its type and resource', () => {
        render(<SubscriptionEventsTable events={[EVENT]} />);

        screen.getByText('payment');
        screen.getByText('pay_999');
    });

    it('opens the payload as pretty-printed JSON', async () => {
        render(<SubscriptionEventsTable events={[EVENT]} />);

        fireEvent.click(screen.getByRole('button', { name: 'Ver payload' }));

        const dialog = await screen.findByRole('dialog');
        expect(dialog.querySelector('pre')?.textContent).toBe(
            JSON.stringify(EVENT.payload, null, 2),
        );
    });

    it('shows an empty state when no notification arrived yet', () => {
        render(<SubscriptionEventsTable events={[]} />);

        screen.getByText('Sin eventos del proveedor');
    });
});
