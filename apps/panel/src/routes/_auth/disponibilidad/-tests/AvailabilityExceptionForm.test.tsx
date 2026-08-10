import { api } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeExceptionDescription } from '../-components/availability-merge';
import { AvailabilityExceptionForm } from '../-components/AvailabilityExceptionForm';
import { useAvailabilityPermissions } from '../-hooks/use-availability-permissions';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate: vi.fn() }) };
});

function renderForm(props: {
    membershipId: number;
    canManageOrgWide: boolean;
}) {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <AvailabilityExceptionForm
                membershipId={props.membershipId}
                canManageOrgWide={props.canManageOrgWide}
                onDone={() => {}}
            />
        </QueryClientProvider>,
    );
}

function businessAxiosError(code: string, context: Record<string, unknown>) {
    return {
        isAxiosError: true,
        response: {
            status: 409,
            data: { error: { code, message: 'x', context } },
        },
    };
}

const MERGE_PROPOSAL = {
    merged: { start: '2026-08-10T09:00', end: '2026-08-10T12:00' },
    absorbed: [{ start: '2026-08-10T11:00', end: '2026-08-10T12:00' }],
};

function fillDates() {
    fireEvent.change(screen.getByLabelText(/Desde/), {
        target: { value: '2026-08-10T09:00' },
    });
    fireEvent.change(screen.getByLabelText(/Hasta/), {
        target: { value: '2026-08-10T11:00' },
    });
}

describe('AvailabilityExceptionForm', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        vi.mocked(api.get).mockReset();
    });

    it('posts membership_id: null when the org-wide control is enabled', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderForm({ membershipId: 3, canManageOrgWide: true });

        fillDates();
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Aplicar a toda la organización',
            }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/availability-exceptions',
                expect.objectContaining({ membership_id: null }),
            ),
        );
    });

    it('posts the selected membership id when the org-wide control is off', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderForm({ membershipId: 3, canManageOrgWide: true });

        fillDates();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/availability-exceptions',
                expect.objectContaining({ membership_id: 3 }),
            ),
        );
    });

    it('does not render the org-wide control when the session only holds availability.manage.own', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({
            data: {
                id: 1,
                name: 'Prof',
                email: 'prof@example.com',
                permissions: ['availability.manage.own'],
            },
        });

        const queryClient = new QueryClient();

        function Wrapper() {
            const { canManageOrgWide } = useAvailabilityPermissions();
            return (
                <AvailabilityExceptionForm
                    membershipId={3}
                    canManageOrgWide={canManageOrgWide}
                    onDone={() => {}}
                />
            );
        }

        render(
            <QueryClientProvider client={queryClient}>
                <Wrapper />
            </QueryClientProvider>,
        );

        await waitFor(() => expect(api.get).toHaveBeenCalledWith('/me'));

        expect(screen.queryByText('Aplicar a toda la organización')).toBeNull();
        expect(
            screen.queryByRole('checkbox', {
                name: 'Aplicar a toda la organización',
            }),
        ).toBeNull();
    });

    it('shows an inline message when endAt is not after startAt, and does not call POST', async () => {
        renderForm({ membershipId: 3, canManageOrgWide: true });

        fireEvent.change(screen.getByLabelText(/Desde/), {
            target: { value: '2026-08-10T11:00' },
        });
        fireEvent.change(screen.getByLabelText(/Hasta/), {
            target: { value: '2026-08-10T09:00' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await screen.findByText(
            'La fecha de fin debe ser posterior a la de inicio.',
        );
        expect(api.post).not.toHaveBeenCalled();
    });

    it('opens the merge dialog on a 409 exception_merge_required and re-sends the same values with merge: true on confirm', async () => {
        vi.mocked(api.post)
            .mockRejectedValueOnce(
                businessAxiosError(
                    'availability.exception_merge_required',
                    MERGE_PROPOSAL,
                ),
            )
            .mockResolvedValueOnce({ data: {} });
        renderForm({ membershipId: 3, canManageOrgWide: true });

        fillDates();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await screen.findByText(mergeExceptionDescription(MERGE_PROPOSAL));

        const dialog = screen.getByRole('alertdialog');
        fireEvent.click(
            within(dialog).getByRole('button', { name: 'Combinar' }),
        );

        await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
        expect(api.post).toHaveBeenNthCalledWith(
            2,
            '/availability-exceptions',
            {
                membership_id: 3,
                type: 'blocked',
                start_at: '2026-08-10T09:00',
                end_at: '2026-08-10T11:00',
                reason: null,
                merge: true,
            },
        );
    });

    it('closes the merge dialog and sends no further request when cancelled', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(
            businessAxiosError(
                'availability.exception_merge_required',
                MERGE_PROPOSAL,
            ),
        );
        renderForm({ membershipId: 3, canManageOrgWide: true });

        fillDates();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await screen.findByText(mergeExceptionDescription(MERGE_PROPOSAL));

        const dialog = screen.getByRole('alertdialog');
        fireEvent.click(
            within(dialog).getByRole('button', { name: 'Cancelar' }),
        );

        await waitFor(() =>
            expect(
                screen.queryByText(mergeExceptionDescription(MERGE_PROPOSAL)),
            ).toBeNull(),
        );
        expect(api.post).toHaveBeenCalledTimes(1);
    });
});
