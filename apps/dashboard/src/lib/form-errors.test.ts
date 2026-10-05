import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { applyFormErrors, extractFormErrors } from './form-errors';

function axiosError(status: number, data: unknown) {
    return { isAxiosError: true, response: { status, data } };
}

function formDouble<TFieldValues extends FieldValues>() {
    return { setError: vi.fn() } as unknown as UseFormReturn<TFieldValues>;
}

describe('extractFormErrors', () => {
    it('returns the first message per field for a 422 with errors', () => {
        const error = axiosError(422, {
            message: 'Los datos ingresados no son válidos.',
            errors: {
                email: ['El correo ya está en uso.', 'Otro mensaje ignorado.'],
                password: ['La contraseña es demasiado corta.'],
            },
        });

        const { message, errors } = extractFormErrors(error);

        expect(message).toBe('Los datos ingresados no son válidos.');
        expect(errors).toEqual({
            email: 'El correo ya está en uso.',
            password: 'La contraseña es demasiado corta.',
        });
    });

    it('exposes a message-only 422 as the general message with no field errors', () => {
        const error = axiosError(422, { message: 'Invalid credentials.' });

        const { message, errors } = extractFormErrors(error);

        expect(message).toBe('Invalid credentials.');
        expect(errors).toEqual({});
    });

    it('falls back to the generic Spanish message for a non-axios error', () => {
        const { message, errors } = extractFormErrors(
            new Error('network error'),
        );

        expect(message).toBe(
            'Ocurrió un error inesperado. Intentá nuevamente.',
        );
        expect(errors).toEqual({});
    });

    it('returns the session-expired message for a 419', () => {
        const error = axiosError(419, {});

        const { message, errors } = extractFormErrors(error);

        expect(message).toBe(
            'Tu sesión expiró. Recargá la página e intentá de nuevo.',
        );
        expect(errors).toEqual({});
    });

    it('falls back to the generic message for a 500', () => {
        const error = axiosError(500, {});

        const { message, errors } = extractFormErrors(error);

        expect(message).toBe(
            'Ocurrió un error inesperado. Intentá nuevamente.',
        );
        expect(errors).toEqual({});
    });
});

describe('applyFormErrors', () => {
    it('sets every mapped field and no root when all keys are mapped', () => {
        const form = formDouble<{ startTime: string; endTime: string }>();

        applyFormErrors(
            form,
            { message: 'B', errors: { start_time: 'A', end_time: 'B' } },
            { start_time: 'startTime', end_time: 'endTime' },
        );

        expect(form.setError).toHaveBeenCalledWith('startTime', {
            message: 'A',
        });
        expect(form.setError).toHaveBeenCalledWith('endTime', {
            message: 'B',
        });
        expect(form.setError).not.toHaveBeenCalledWith(
            'root',
            expect.anything(),
        );
    });

    it('sets root from the unmapped key, not the top-level message', () => {
        const form = formDouble<{ endTime: string }>();

        applyFormErrors(
            form,
            { message: 'B', errors: { end_time: 'B', extra_field: 'C' } },
            { end_time: 'endTime' },
        );

        expect(form.setError).toHaveBeenCalledWith('endTime', {
            message: 'B',
        });
        expect(form.setError).toHaveBeenCalledWith('root', { message: 'C' });
        expect(form.setError).not.toHaveBeenCalledWith('root', {
            message: 'B',
        });
    });

    it('sets root from the first unmapped key when nothing is mapped', () => {
        const form = formDouble<FieldValues>();

        applyFormErrors(
            form,
            { message: 'primera', errors: { a: 'primera', b: 'segunda' } },
            {},
        );

        expect(form.setError).toHaveBeenCalledWith('root', {
            message: 'primera',
        });
        expect(form.setError).toHaveBeenCalledTimes(1);
    });

    it('keeps the general message when there are no field errors', () => {
        const form = formDouble<FieldValues>();
        const message = 'Ocurrió un error inesperado. Intentá nuevamente.';

        applyFormErrors(form, { message, errors: {} }, {});

        expect(form.setError).toHaveBeenCalledWith('root', { message });
    });

    it('sets the mapped field for a business-error 409 without touching root', () => {
        const form = formDouble<{ documentNumber: string }>();

        applyFormErrors(
            form,
            {
                message: null,
                errors: {
                    documentNumber: 'Ya existe un paciente con ese documento.',
                },
            },
            { documentNumber: 'documentNumber' },
        );

        expect(form.setError).toHaveBeenCalledWith('documentNumber', {
            message: 'Ya existe un paciente con ese documento.',
        });
        expect(form.setError).not.toHaveBeenCalledWith(
            'root',
            expect.anything(),
        );
    });

    it('never calls setError when there is nothing to show', () => {
        const form = formDouble<FieldValues>();

        applyFormErrors(form, { message: null, errors: {} }, {});

        expect(form.setError).not.toHaveBeenCalled();
    });
});
