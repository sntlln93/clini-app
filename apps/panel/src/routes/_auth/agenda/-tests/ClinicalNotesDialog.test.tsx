import { api } from '@/lib/api';
import { subscriptionQueryOptions } from '@/lib/subscription';
import { buildClinicalNote } from '@/tests/fixtures/clinical-note';
import { buildSubscription } from '@/tests/fixtures/subscription';
import type { Appointment } from '@/types/appointment';
import type { Subscription } from '@/types/subscription';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClinicalNotesDialog } from '../-components/ClinicalNotesDialog';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

// No router is mounted: the refresh after a write only needs `invalidate`.
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate: vi.fn() }) };
});

function unexpectedError() {
    return {
        isAxiosError: true,
        response: { status: 500, data: {} },
    };
}

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
};

const buildNote = buildClinicalNote;

function renderDialog(
    open: boolean = true,
    onOpenChange: (open: boolean) => void = () => {},
    subscription?: Subscription,
) {
    const queryClient = new QueryClient();
    if (subscription !== undefined) {
        queryClient.setQueryData(
            subscriptionQueryOptions.queryKey,
            subscription,
        );
    }
    render(
        <QueryClientProvider client={queryClient}>
            <ClinicalNotesDialog
                open={open}
                onOpenChange={onOpenChange}
                appointment={APPOINTMENT}
            />
        </QueryClientProvider>,
    );
}

describe('ClinicalNotesDialog', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
    });

    it('opening the dialog fetches the appointment notes and renders them', async () => {
        const noteA = buildNote({ id: 1, body: 'Primera nota.' });
        const noteB = buildNote({ id: 2, body: 'Segunda nota.' });
        vi.mocked(api.get).mockResolvedValue({
            data: { data: [noteA, noteB] },
        });

        renderDialog();

        await screen.findByText('Primera nota.');
        expect(screen.getByText('Segunda nota.')).toBeTruthy();
        expect(api.get).toHaveBeenCalledWith('/appointments/42/clinical-notes');
    });

    it('makes no request while the dialog is closed', () => {
        renderDialog(false);

        expect(api.get).not.toHaveBeenCalled();
    });

    it('submitting the form posts the typed body and refetches the list', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'Paciente refiere mejoría.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Agregar nota' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/42/clinical-notes',
                { body: 'Paciente refiere mejoría.', icd10_code_ids: [] },
            ),
        );
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });

    it('an empty body does not trigger the mutation and shows the validation message', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
        renderDialog();

        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByRole('button', { name: 'Agregar nota' }));

        await screen.findByText('La nota no puede estar vacía.');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('a whitespace-only body does not trigger the mutation and shows the validation message', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
        renderDialog();

        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: '   ' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Agregar nota' }));

        await screen.findByText('La nota no puede estar vacía.');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('offers to amend or annul a note, never to edit or delete it', async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: { data: [buildNote({ body: 'Nota original.' })] },
        });
        renderDialog();

        await screen.findByText('Nota original.');
        expect(screen.getByRole('button', { name: 'Enmendar' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Anular' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Borrar' })).toBeNull();
    });

    it('amending a note posts the corrected text and the reason as an amendment', async () => {
        const note = buildNote({ id: 7, body: 'Nota original.' });
        vi.mocked(api.get).mockResolvedValue({ data: { data: [note] } });
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await screen.findByText('Nota original.');
        fireEvent.click(screen.getByRole('button', { name: 'Enmendar' }));

        const textarea = (await screen.findByLabelText(
            'Texto corregido',
        )) as HTMLTextAreaElement;
        await waitFor(() => expect(textarea.value).toBe('Nota original.'));

        fireEvent.change(textarea, {
            target: { value: 'Nota corregida tras la consulta.' },
        });
        fireEvent.change(
            screen.getByLabelText('Motivo de la enmienda (opcional)'),
            { target: { value: 'Dosis mal escrita.' } },
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar enmienda' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/clinical-notes/7/amendments',
                {
                    body: 'Nota corregida tras la consulta.',
                    icd10_code_ids: [],
                    reason: 'Dosis mal escrita.',
                },
            ),
        );
    });

    it('an amendment starts from the current diagnoses and sends what is left of them (#324)', async () => {
        const note = buildNote({
            id: 7,
            body: 'Nota original.',
            diagnoses: [
                { icd10_code_id: 3, code: 'R51', description: 'Cefalea' },
                {
                    icd10_code_id: 4,
                    code: 'G43.9',
                    description: 'Migraña, no especificada',
                },
            ],
        });
        vi.mocked(api.get).mockResolvedValue({ data: { data: [note] } });
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await screen.findByText('Nota original.');
        fireEvent.click(screen.getByRole('button', { name: 'Enmendar' }));
        fireEvent.click(
            await screen.findByRole('button', { name: 'Quitar R51' }),
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar enmienda' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/clinical-notes/7/amendments',
                { body: 'Nota original.', icd10_code_ids: [4], reason: null },
            ),
        );
    });

    it('an amendment without a reason sends it as null', async () => {
        const note = buildNote({ id: 7, body: 'Nota original.' });
        vi.mocked(api.get).mockResolvedValue({ data: { data: [note] } });
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await screen.findByText('Nota original.');
        fireEvent.click(screen.getByRole('button', { name: 'Enmendar' }));
        const textarea = await screen.findByLabelText('Texto corregido');
        await waitFor(() =>
            expect((textarea as HTMLTextAreaElement).value).toBe(
                'Nota original.',
            ),
        );
        fireEvent.change(textarea, { target: { value: 'Nota corregida.' } });
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar enmienda' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/clinical-notes/7/amendments',
                { body: 'Nota corregida.', icd10_code_ids: [], reason: null },
            ),
        );
    });

    it('annulling a note asks for a reason, posts it and refreshes the list', async () => {
        const note = buildNote({
            id: 9,
            body: 'Nota del paciente equivocado.',
        });
        vi.mocked(api.get).mockResolvedValue({ data: { data: [note] } });
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await screen.findByText('Nota del paciente equivocado.');
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByRole('button', { name: 'Anular' }));
        fireEvent.change(await screen.findByLabelText('Motivo'), {
            target: { value: 'Cargada en el turno de otro paciente.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Anular nota' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/clinical-notes/9/annulment',
                { reason: 'Cargada en el turno de otro paciente.' },
            ),
        );
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });

    it('annulling the note being amended leaves amend mode', async () => {
        const note = buildNote({ id: 9, body: 'Nota a anular.' });
        vi.mocked(api.get)
            .mockResolvedValueOnce({ data: { data: [note] } })
            .mockResolvedValue({
                data: {
                    data: [
                        {
                            ...note,
                            annulment: {
                                reason: 'Paciente equivocado.',
                                created_at: '2026-08-03T11:00:00Z',
                            },
                        },
                    ],
                },
            });
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await screen.findByText('Nota a anular.');
        fireEvent.click(screen.getByRole('button', { name: 'Enmendar' }));
        await screen.findByRole('button', { name: 'Guardar enmienda' });
        fireEvent.click(screen.getByRole('button', { name: 'Anular' }));
        fireEvent.change(await screen.findByLabelText('Motivo'), {
            target: { value: 'Paciente equivocado.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Anular nota' }));

        await screen.findByText('Anulada');
        await waitFor(() =>
            expect(
                screen.queryByRole('button', { name: 'Guardar enmienda' }),
            ).toBeNull(),
        );
        // Once the annul dialog has closed, the note form is reachable again.
        expect(
            await screen.findByRole('button', { name: 'Agregar nota' }),
        ).toBeTruthy();
    });

    it('an annulled note shows the reason, keeps its text and offers no actions', async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: {
                data: [
                    buildNote({
                        body: 'Nota anulada.',
                        annulment: {
                            reason: 'Paciente equivocado.',
                            created_at: '2026-08-03T11:00:00Z',
                        },
                    }),
                ],
            },
        });
        renderDialog();

        await screen.findByText('Anulada');
        expect(screen.getByText('Motivo: Paciente equivocado.')).toBeTruthy();
        expect(screen.getByText('Ver el texto anulado')).toBeTruthy();
        expect(screen.getByText('Nota anulada.')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Enmendar' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Anular' })).toBeNull();
    });

    it('shows a server error inline and keeps the dialog open', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
        vi.mocked(api.post).mockRejectedValueOnce(unexpectedError());
        const onOpenChange = vi.fn();
        renderDialog(true, onOpenChange);

        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'Nota que fallará al guardar.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Agregar nota' }));

        await screen.findByText(
            'Ocurrió un error inesperado. Intentá nuevamente.',
        );
        expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });

    it.each(['expired'] as const)(
        'while the subscription is %s it lists the notes but hides the form and the amend/annul actions',
        async (status) => {
            vi.mocked(api.get).mockResolvedValue({
                data: { data: [buildNote({ body: 'Nota previa.' })] },
            });
            renderDialog(true, () => {}, buildSubscription(status));

            await screen.findByText('Nota previa.');
            expect(screen.queryByRole('textbox')).toBeNull();
            expect(
                screen.queryByRole('button', { name: 'Agregar nota' }),
            ).toBeNull();
            expect(
                screen.queryByRole('button', { name: 'Enmendar' }),
            ).toBeNull();
            expect(screen.queryByRole('button', { name: 'Anular' })).toBeNull();
        },
    );
});
