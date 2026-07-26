import { describe, expect, it } from 'vitest';
import { extractFormErrors } from './form-errors';

function axiosError(status: number, data: unknown) {
    return { isAxiosError: true, response: { status, data } };
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
