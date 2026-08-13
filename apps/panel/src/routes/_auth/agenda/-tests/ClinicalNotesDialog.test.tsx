import { api } from '@/lib/api';
import type { Appointment } from '@/types/appointment';
import type { ClinicalNote } from '@/types/clinical-note';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClinicalNotesDialog } from '../-components/ClinicalNotesDialog';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

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
};

function buildNote(overrides: Partial<ClinicalNote> = {}): ClinicalNote {
    return {
        id: 1,
        appointment_id: 42,
        membership_id: 1,
        body: 'Nota original.',
        created_at: '2026-08-03T09:00:00',
        updated_at: '2026-08-03T09:00:00',
        ...overrides,
    };
}

function renderDialog(
    open: boolean = true,
    onOpenChange: (open: boolean) => void = () => {},
) {
    const queryClient = new QueryClient();
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
        vi.mocked(api.patch).mockReset();
        vi.mocked(api.delete).mockReset();
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
                { body: 'Paciente refiere mejoría.' },
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

    it('editing an existing note sends a PATCH with the edited body', async () => {
        const note = buildNote({ id: 7, body: 'Nota original.' });
        vi.mocked(api.get).mockResolvedValue({ data: { data: [note] } });
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await screen.findByText('Nota original.');

        fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

        const textarea = (await screen.findByRole(
            'textbox',
        )) as HTMLTextAreaElement;
        await waitFor(() => expect(textarea.value).toBe('Nota original.'));

        fireEvent.change(textarea, {
            target: { value: 'Nota editada tras la consulta.' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        );

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/clinical-notes/7', {
                body: 'Nota editada tras la consulta.',
            }),
        );
    });

    it('deleting a note calls DELETE and refreshes the list', async () => {
        const note = buildNote({ id: 9, body: 'Nota a borrar.' });
        vi.mocked(api.get).mockResolvedValue({ data: { data: [note] } });
        vi.mocked(api.delete).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await screen.findByText('Nota a borrar.');
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
        fireEvent.click(
            await screen.findByRole('button', { name: 'Confirmar' }),
        );

        await waitFor(() =>
            expect(api.delete).toHaveBeenCalledWith('/clinical-notes/9'),
        );
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
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
});
