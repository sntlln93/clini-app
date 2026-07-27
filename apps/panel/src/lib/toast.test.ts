import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyError, notifySuccess } from './toast';

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

function axiosError(data: unknown) {
    return { isAxiosError: true, response: { status: 422, data } };
}

beforeEach(() => {
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
});

describe('notifySuccess', () => {
    it('calls toast.success once with the exact message', () => {
        notifySuccess('Especialidad asignada');

        expect(toast.success).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('Especialidad asignada');
    });
});

describe('notifyError', () => {
    it('uses the server message from an axios error with response.data.message', () => {
        const error = axiosError({ message: 'No se pudo asignar.' });

        notifyError(error, 'Fallback message');

        expect(toast.error).toHaveBeenCalledWith('No se pudo asignar.');
    });

    it('falls back when the axios error response body has no message field', () => {
        const error = axiosError({ errors: {} });

        notifyError(error, 'Fallback message');

        expect(toast.error).toHaveBeenCalledWith('Fallback message');
    });

    it('falls back for a plain non-axios Error', () => {
        notifyError(new Error('network error'), 'Fallback message');

        expect(toast.error).toHaveBeenCalledWith('Fallback message');
    });

    it('falls back for a non-axios, non-Error value', () => {
        notifyError('just a string', 'Fallback message');

        expect(toast.error).toHaveBeenCalledWith('Fallback message');
    });
});
