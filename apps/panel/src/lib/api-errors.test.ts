import { describe, expect, it } from 'vitest';
import {
    BusinessError,
    ForbiddenError,
    NetworkError,
    RateLimitedError,
    SessionExpiredError,
    UnauthorizedError,
    UnexpectedError,
    ValidationError,
    mapToAppError,
    type AppError,
} from './api-errors';
import { messageForAppError } from './error-codes';

function axiosError(status: number, data: unknown) {
    return { isAxiosError: true, response: { status, data } };
}

describe('mapToAppError', () => {
    it('maps a domain envelope to a BusinessError, regardless of status', () => {
        const error = axiosError(409, {
            error: {
                code: 'appointments.slot_taken',
                message:
                    'The professional already has an appointment at that time.',
                context: {},
            },
        });

        const appError = mapToAppError(error);

        expect(appError).toBeInstanceOf(BusinessError);
        expect(appError.kind).toBe('business');
        if (appError instanceof BusinessError) {
            expect(appError.code).toBe('appointments.slot_taken');
            expect(appError.context).toEqual({});
        }
    });

    it('maps a domain envelope on a 403/404 the same way as on a 409', () => {
        const forbidden = mapToAppError(
            axiosError(403, {
                error: {
                    code: 'organizations.no_active_membership',
                    message: 'x',
                    context: {},
                },
            }),
        );
        const notFound = mapToAppError(
            axiosError(404, {
                error: {
                    code: 'patients.not_found',
                    message: 'x',
                    context: {},
                },
            }),
        );

        expect(forbidden).toBeInstanceOf(BusinessError);
        expect(notFound).toBeInstanceOf(BusinessError);
    });

    it('maps a native 422 validation shape to a ValidationError with the first message per field', () => {
        const error = axiosError(422, {
            message: 'The given data was invalid.',
            errors: {
                start_at: [
                    'El horario es obligatorio.',
                    'Otro mensaje ignorado.',
                ],
            },
        });

        const appError = mapToAppError(error);

        expect(appError).toBeInstanceOf(ValidationError);
        if (appError instanceof ValidationError) {
            expect(appError.fields).toEqual({
                start_at: 'El horario es obligatorio.',
            });
        }
    });

    it('maps a 401 to UnauthorizedError', () => {
        expect(mapToAppError(axiosError(401, {}))).toBeInstanceOf(
            UnauthorizedError,
        );
    });

    it('maps a 403 with no domain envelope to a ForbiddenError', () => {
        const appError = mapToAppError(
            axiosError(403, { message: 'This action is unauthorized.' }),
        );

        expect(appError).toBeInstanceOf(ForbiddenError);
        expect(appError.kind).toBe('forbidden');
    });

    it('still maps a 403 domain envelope to a BusinessError with its code, not a ForbiddenError', () => {
        const appError = mapToAppError(
            axiosError(403, {
                error: {
                    code: 'organizations.no_active_membership',
                    message: 'x',
                    context: {},
                },
            }),
        );

        expect(appError).toBeInstanceOf(BusinessError);
        expect(appError).not.toBeInstanceOf(ForbiddenError);
        if (appError instanceof BusinessError) {
            expect(appError.code).toBe('organizations.no_active_membership');
        }
    });

    it('maps a 403 with an empty or null body to a ForbiddenError without throwing', () => {
        expect(() => mapToAppError(axiosError(403, null))).not.toThrow();
        expect(mapToAppError(axiosError(403, null))).toBeInstanceOf(
            ForbiddenError,
        );
        expect(mapToAppError(axiosError(403, {}))).toBeInstanceOf(
            ForbiddenError,
        );
    });

    it('maps a 419 to SessionExpiredError', () => {
        expect(mapToAppError(axiosError(419, {}))).toBeInstanceOf(
            SessionExpiredError,
        );
    });

    it('maps a 429 to RateLimitedError', () => {
        expect(mapToAppError(axiosError(429, {}))).toBeInstanceOf(
            RateLimitedError,
        );
    });

    it('maps an axios error with no response to NetworkError', () => {
        const error = { isAxiosError: true, response: undefined };

        expect(mapToAppError(error)).toBeInstanceOf(NetworkError);
    });

    it('maps a 500 with no domain envelope to UnexpectedError', () => {
        expect(mapToAppError(axiosError(500, {}))).toBeInstanceOf(
            UnexpectedError,
        );
    });

    it('maps a non-axios error to UnexpectedError', () => {
        expect(mapToAppError(new Error('boom'))).toBeInstanceOf(
            UnexpectedError,
        );
    });

    it('exhausts every AppError kind (compile-time proof via a never default)', () => {
        function describeKind(error: AppError): string {
            switch (error.kind) {
                case 'business':
                    return 'business';
                case 'validation':
                    return 'validation';
                case 'unauthorized':
                    return 'unauthorized';
                case 'forbidden':
                    return 'forbidden';
                case 'session_expired':
                    return 'session_expired';
                case 'rate_limited':
                    return 'rate_limited';
                case 'network':
                    return 'network';
                case 'unexpected':
                    return 'unexpected';
                default: {
                    const exhaustive: never = error;

                    throw new Error(
                        `Unhandled AppError kind: ${JSON.stringify(exhaustive)}`,
                    );
                }
            }
        }

        expect(describeKind(new UnexpectedError())).toBe('unexpected');
    });
});

describe('messageForAppError', () => {
    it('returns the permissions copy for a ForbiddenError, not the generic unexpected message', () => {
        const message = messageForAppError(new ForbiddenError());

        expect(message).toBe(
            'No tenés permiso para ver esta sección. Pedí acceso a un administrador.',
        );
        expect(message).not.toBe(
            'Ocurrió un error inesperado. Intentá nuevamente.',
        );
    });
});
