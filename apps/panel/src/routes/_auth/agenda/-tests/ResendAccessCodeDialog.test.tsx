import { api } from '@/lib/api';
import type { Appointment } from '@/types/appointment';
import type { PatientContact } from '@/types/patient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResendAccessCodeDialog } from '../-components/ResendAccessCodeDialog';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const APPOINTMENT: Appointment = {
    id: 42,
    membership_id: 1,
    patient_id: 50,
    service_id: 100,
    status: 'scheduled',
    origin: 'manual',
    start_at: '2026-08-03T10:00:00',
    end_at: '2026-08-03T10:30:00',
    reason: null,
    notes: null,
    cancelled_at: null,
    cancellation_reason: null,
    rescheduled_from_id: null,
    reported_insurance_provider_id: null,
    reported_insurance_member_number: null,
    arrived_at: null,
    patient_name: 'Juan Pérez',
    professional_name: 'Dra. Ana López',
};

function contact(overrides: Partial<PatientContact>): PatientContact {
    return {
        id: 1,
        type: 'email',
        value: 'juan@example.com',
        display: 'juan@example.com',
        label: null,
        needs_confirmation: false,
        ...overrides,
    };
}

function renderDialog(
    contacts: PatientContact[],
    onOpenChange: (open: boolean) => void = () => {},
) {
    vi.mocked(api.get).mockResolvedValue({
        data: { data: { id: 50, contacts } },
    });
    render(
        <QueryClientProvider client={new QueryClient()}>
            <ResendAccessCodeDialog
                open
                onOpenChange={onOpenChange}
                appointment={APPOINTMENT}
            />
        </QueryClientProvider>,
    );
}

// #364: the reception resends the patient's code, only to a confirmed email.
describe('ResendAccessCodeDialog', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
    });

    it("offers only the patient's confirmed emails", async () => {
        renderDialog([
            contact({ id: 1 }),
            contact({
                id: 2,
                value: 'nuevo@example.com',
                display: 'nuevo@example.com',
                needs_confirmation: true,
            }),
            contact({
                id: 3,
                type: 'phone',
                value: '+5491122334455',
                display: '11 2233-4455',
            }),
            contact({
                id: 4,
                value: 'madre@example.com',
                display: 'madre@example.com',
            }),
        ]);

        expect(
            await screen.findByRole('radio', { name: 'juan@example.com' }),
        ).not.toBeNull();
        expect(
            screen.getByRole('radio', { name: 'madre@example.com' }),
        ).not.toBeNull();
        expect(
            screen.queryByRole('radio', { name: 'nuevo@example.com' }),
        ).toBeNull();
        expect(
            screen.queryByRole('radio', { name: '11 2233-4455' }),
        ).toBeNull();
        expect(api.get).toHaveBeenCalledWith('/patients/50');
    });

    it('sends the code to the chosen email and closes', async () => {
        const onOpenChange = vi.fn();
        vi.mocked(api.post).mockResolvedValueOnce({ data: null });
        renderDialog(
            [
                contact({ id: 1 }),
                contact({
                    id: 4,
                    value: 'madre@example.com',
                    display: 'madre@example.com',
                }),
            ],
            onOpenChange,
        );

        fireEvent.click(
            await screen.findByRole('radio', { name: 'madre@example.com' }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/42/access-code-deliveries',
                { contact_id: 4 },
            ),
        );
        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    });

    it('explains there is nowhere to send it without a confirmed email', async () => {
        renderDialog([contact({ needs_confirmation: true })]);

        await screen.findByText(/no tiene un email confirmado/);
        expect(
            screen
                .getByRole('button', { name: 'Enviar código' })
                .hasAttribute('disabled'),
        ).toBe(true);
    });

    it('shows why the API refused it', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    error: {
                        code: 'clinical_access.code_unavailable',
                        message: 'The appointment has no access code to send.',
                        context: {},
                    },
                },
            },
        });
        renderDialog([contact({ id: 1 })]);

        await screen.findByRole('radio', { name: 'juan@example.com' });
        fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));

        await screen.findByText(/Este turno ya no tiene código/);
    });
});
