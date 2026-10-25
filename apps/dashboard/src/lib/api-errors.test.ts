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
    errorDetailsFor,
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

describe('mapToAppError keeps the status a page is chosen by (#304)', () => {
    it('keeps the status of an unexpected HTTP failure', () => {
        expect(mapToAppError(axiosError(404, {}))).toMatchObject({
            kind: 'unexpected',
            status: 404,
        });
        expect(mapToAppError(axiosError(503, {}))).toMatchObject({
            kind: 'unexpected',
            status: 503,
        });
    });

    it('has no status for a failure no response caused', () => {
        expect(mapToAppError(new TypeError('x is undefined'))).toMatchObject({
            kind: 'unexpected',
            status: null,
        });
    });

    it('keeps the status the API chose for a business rule', () => {
        const error = axiosError(404, {
            error: { code: 'patients.not_found', message: 'x', context: {} },
        });

        expect(mapToAppError(error)).toMatchObject({
            kind: 'business',
            status: 404,
        });
    });
});

describe('errorDetailsFor', () => {
    it("reads Laravel's debug body and the request that got it", () => {
        const details = errorDetailsFor({
            isAxiosError: true,
            message: 'Request failed with status code 500',
            response: {
                status: 500,
                config: {
                    method: 'get',
                    baseURL: 'http://api.test/api/v1',
                    url: '/patients',
                },
                data: {
                    message: 'Division by zero',
                    exception: 'DivisionByZeroError',
                    file: '/var/www/html/app/Actions/X.php',
                    line: 12,
                    trace: [
                        {
                            file: '/var/www/html/app/Http/Y.php',
                            line: 30,
                            class: 'App\\Http\\Y',
                            type: '->',
                            function: 'index',
                        },
                    ],
                },
            },
        });

        expect(details).toEqual({
            name: 'DivisionByZeroError',
            message: 'Division by zero',
            location: '/var/www/html/app/Actions/X.php:12',
            trace: ['/var/www/html/app/Http/Y.php:30 App\\Http\\Y->index'],
            request: {
                method: 'GET',
                url: 'http://api.test/api/v1/patients',
                status: 500,
            },
        });
    });

    it('falls back to the status when the API sent no debug body', () => {
        const details = errorDetailsFor({
            isAxiosError: true,
            message: 'Request failed with status code 500',
            response: { status: 500, data: { message: 'Server Error' } },
        });

        expect(details).toMatchObject({
            name: 'HTTP 500',
            message: 'Server Error',
            location: null,
            trace: [],
        });
    });

    it("reads a crash's own name, message and stack frames", () => {
        const error = new TypeError('cannot read x');
        error.stack =
            'TypeError: cannot read x\n    at Page (http://localhost/src/Page.tsx:3:9)\n    at render (react.js:1:1)';

        expect(errorDetailsFor(error)).toEqual({
            name: 'TypeError',
            message: 'cannot read x',
            location: null,
            trace: [
                'at Page (http://localhost/src/Page.tsx:3:9)',
                'at render (react.js:1:1)',
            ],
            request: null,
        });
    });
});

describe('messageForAppError', () => {
    it('returns the permissions copy for a ForbiddenError, not the generic unexpected message', () => {
        const message = messageForAppError(new ForbiddenError());

        expect(message).toBe(
            'No tenés permiso para acceder a esta sección del panel de operación.',
        );
        expect(message).not.toBe(
            'Ocurrió un error inesperado. Intentá nuevamente.',
        );
    });
});
