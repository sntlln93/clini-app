import { api } from '@/lib/api';
import type { AvailabilityException } from '@/types/availability';
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

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate: vi.fn() }) };
});

const ORG_WIDE = 'Todo el consultorio (feriado o cierre)';

function renderForm(
    props: {
        canManageOrgWide?: boolean;
        exception?: AvailabilityException;
    } = {},
) {
    const onDone = vi.fn();
    render(
        <QueryClientProvider client={new QueryClient()}>
            <AvailabilityExceptionForm
                membershipId={3}
                canManageOrgWide={props.canManageOrgWide ?? false}
                exception={props.exception}
                onDone={onDone}
            />
        </QueryClientProvider>,
    );
    return { onDone };
}

function type(label: string, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function save() {
    fireEvent.click(screen.getByRole('button', { name: 'Guardar excepción' }));
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

// As the API serializes them: UTC instants (09:00–12:00 and 11:00–12:00 in Buenos Aires).
const MERGE_PROPOSAL = {
    merged: {
        start: '2026-08-10T12:00:00.000000Z',
        end: '2026-08-10T15:00:00.000000Z',
    },
    absorbed: [
        {
            start: '2026-08-10T14:00:00.000000Z',
            end: '2026-08-10T15:00:00.000000Z',
        },
    ],
};

// Vitest runs in Buenos Aires (UTC-3): the practice's midnight is 03:00Z.
describe('AvailabilityExceptionForm', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        vi.mocked(api.patch).mockReset();
    });

    it('sends a «Sin atención» range as whole days, «Hasta» following «Desde»', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const { onDone } = renderForm();

        type('Desde', '2027-01-04');
        expect(screen.getByLabelText<HTMLInputElement>('Hasta').value).toBe(
            '2027-01-04',
        );
        type('Hasta', '2027-01-15');
        screen.getByText('No atiende del lun 4 al vie 15 de enero (12 días).');
        save();

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith('/availability-exceptions', {
                membership_id: 3,
                type: 'blocked',
                start_at: '2027-01-04T03:00:00.000Z',
                end_at: '2027-01-16T03:00:00.000Z',
                reason: null,
            }),
        );
        await waitFor(() => expect(onDone).toHaveBeenCalled());
    });

    it('sends the hours of a «Sin atención» that is not all day', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderForm();

        type('Desde', '2027-01-04');
        type('Hasta', '2027-01-06');
        fireEvent.click(screen.getByRole('checkbox', { name: 'Todo el día' }));
        type('Desde la hora', '14:00');
        type('Hasta la hora', '12:00');
        save();

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/availability-exceptions',
                expect.objectContaining({
                    start_at: '2027-01-04T17:00:00.000Z',
                    end_at: '2027-01-06T15:00:00.000Z',
                }),
            ),
        );
    });

    it('sends «Horas adicionales» as one range on one date, for the professional', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderForm({ canManageOrgWide: true });

        fireEvent.click(
            screen.getByRole('radio', { name: 'Horas adicionales' }),
        );
        expect(screen.queryByRole('checkbox', { name: ORG_WIDE })).toBeNull();
        type('Fecha', '2026-11-07');
        type('Desde', '09:00');
        type('Hasta', '13:00');
        fireEvent.change(screen.getByLabelText(/Motivo/), {
            target: { value: 'Atención un sábado' },
        });
        screen.getByText(
            'Atiende además el sáb 7 de noviembre de 09:00 a 13:00.',
        );
        save();

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith('/availability-exceptions', {
                membership_id: 3,
                type: 'extra',
                start_at: '2026-11-07T12:00:00.000Z',
                end_at: '2026-11-07T16:00:00.000Z',
                reason: 'Atención un sábado',
            }),
        );
    });

    it('sends membership_id: null for a «Sin atención» of the whole practice', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderForm({ canManageOrgWide: true });

        type('Desde', '2026-11-23');
        fireEvent.click(screen.getByRole('checkbox', { name: ORG_WIDE }));
        screen.getByText('El consultorio no atiende el lun 23 de noviembre.');
        expect(
            screen.getByRole('radio', { name: 'Horas adicionales' }),
        ).toHaveProperty('dataset.disabled', '');
        save();

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/availability-exceptions',
                expect.objectContaining({ membership_id: null }),
            ),
        );
    });

    it('offers the whole practice only to whoever manages every professional', () => {
        renderForm({ canManageOrgWide: false });

        expect(screen.queryByRole('checkbox', { name: ORG_WIDE })).toBeNull();
    });

    it('shows the client errors in Spanish and sends nothing', async () => {
        renderForm();

        fireEvent.click(
            screen.getByRole('radio', { name: 'Horas adicionales' }),
        );
        type('Fecha', '2026-11-07');
        type('Desde', '13:00');
        type('Hasta', '09:00');
        save();

        await screen.findByText(
            'La hora de fin tiene que ser posterior a la de inicio.',
        );
        expect(api.post).not.toHaveBeenCalled();
    });

    it("shows the API's rejection of the type on the type field", async () => {
        const message =
            'Las horas adicionales son de un profesional. Una excepción para todo el consultorio solo puede ser «Sin atención».';
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 422,
                data: { message, errors: { type: [message] } },
            },
        });
        renderForm();

        type('Desde', '2026-11-23');
        save();

        await screen.findByText(message);
    });

    it('opens the merge dialog on a 409 and re-sends the same values with merge: true', async () => {
        vi.mocked(api.post)
            .mockRejectedValueOnce(
                businessAxiosError(
                    'availability.exception_merge_required',
                    MERGE_PROPOSAL,
                ),
            )
            .mockResolvedValueOnce({ data: {} });
        renderForm();

        type('Desde', '2026-08-10');
        save();

        await screen.findByText(mergeExceptionDescription(MERGE_PROPOSAL));
        fireEvent.click(
            within(screen.getByRole('alertdialog')).getByRole('button', {
                name: 'Combinar',
            }),
        );

        await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
        expect(api.post).toHaveBeenNthCalledWith(
            2,
            '/availability-exceptions',
            expect.objectContaining({
                start_at: '2026-08-10T03:00:00.000Z',
                end_at: '2026-08-11T03:00:00.000Z',
                merge: true,
            }),
        );
    });

    it('reads an existing whole-day exception back as all day and keeps its scope', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        renderForm({
            canManageOrgWide: true,
            exception: {
                id: 9,
                membership_id: null,
                type: 'blocked',
                start_at: '2026-12-24T03:00:00Z',
                end_at: '2026-12-26T03:00:00Z',
                reason: 'Navidad',
            },
        });

        expect(screen.getByLabelText<HTMLInputElement>('Desde').value).toBe(
            '2026-12-24',
        );
        expect(screen.getByLabelText<HTMLInputElement>('Hasta').value).toBe(
            '2026-12-25',
        );
        expect(
            screen
                .getByRole('checkbox', { name: 'Todo el día' })
                .getAttribute('aria-checked'),
        ).toBe('true');
        expect(
            screen
                .getByRole('checkbox', { name: ORG_WIDE })
                .getAttribute('aria-checked'),
        ).toBe('true');
        expect(
            screen.getByRole('radio', { name: 'Horas adicionales' }),
        ).toHaveProperty('dataset.disabled', '');
        save();

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith(
                '/availability-exceptions/9',
                expect.objectContaining({
                    start_at: '2026-12-24T03:00:00.000Z',
                    end_at: '2026-12-26T03:00:00.000Z',
                    reason: 'Navidad',
                }),
            ),
        );
    });

    it("describes a merge with the practice's local ranges, not raw instants", () => {
        expect(mergeExceptionDescription(MERGE_PROPOSAL)).toBe(
            'Ya tenés una excepción del mismo tipo (lun 10 ago, 11:00 – 12:00). Si continuás, queda una sola (lun 10 ago, 09:00 – 12:00), con el motivo que acabás de ingresar.',
        );
    });
});
