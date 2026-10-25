import axios from 'axios';
import type { ErrorCode } from './error-codes';
import {
    detailsFromResponse,
    detailsFromThrown,
    type ErrorDetails,
} from './error-details';

/**
 * A business rule rejected the request. `message` is English and
 * developer-facing — never rendered to the user; UI copy resolves by
 * `code` through `error-codes.ts`.
 */
export class BusinessError extends Error {
    readonly kind = 'business' as const;
    readonly code: ErrorCode;
    readonly context: Record<string, unknown>;
    /** The HTTP status the API chose for the rule (409 for most, 403/404 for some). */
    readonly status: number;

    constructor(
        code: ErrorCode,
        message: string,
        context: Record<string, unknown>,
        status = 409,
    ) {
        super(message);
        this.name = 'BusinessError';
        this.code = code;
        this.context = context;
        this.status = status;
    }
}

/** Laravel's native FormRequest 422 shape, untouched by the domain envelope — see ADR 0009. */
export class ValidationError extends Error {
    readonly kind = 'validation' as const;
    readonly fields: Record<string, string>;
    /** The backend's own message, verbatim; nullable (unlike `Error.message`) so callers can tell "no message" apart from a placeholder. */
    readonly serverMessage: string | null;

    constructor(message: string | null, fields: Record<string, string>) {
        super(message ?? 'Validation error');
        this.name = 'ValidationError';
        this.fields = fields;
        this.serverMessage = message;
    }
}

/** 401: the session is not authenticated at all. */
export class UnauthorizedError extends Error {
    readonly kind = 'unauthorized' as const;

    constructor() {
        super('Unauthorized');
        this.name = 'UnauthorizedError';
    }
}

/** 419: the CSRF token expired — inevitable with Sanctum's cookie mode. */
export class SessionExpiredError extends Error {
    readonly kind = 'session_expired' as const;

    constructor() {
        super('Session expired');
        this.name = 'SessionExpiredError';
    }
}

/** 403 with no domain envelope (session lacks permission); a 403 that does carry one is a `BusinessError` instead. */
export class ForbiddenError extends Error {
    readonly kind = 'forbidden' as const;

    constructor() {
        super('Forbidden');
        this.name = 'ForbiddenError';
    }
}

/** 429: throttling (the logins, sign-up and the public booking page). */
export class RateLimitedError extends Error {
    readonly kind = 'rate_limited' as const;

    constructor() {
        super('Rate limited');
        this.name = 'RateLimitedError';
    }
}

/** No response at all (offline, timeout, connection refused). */
export class NetworkError extends Error {
    readonly kind = 'network' as const;

    constructor() {
        super('Network error');
        this.name = 'NetworkError';
    }
}

/** Anything else: an unexpected failure with no safe details to show. `status` is null when no response caused it (a crash in the page itself). */
export class UnexpectedError extends Error {
    readonly kind = 'unexpected' as const;
    readonly status: number | null;

    constructor(status: number | null = null) {
        super('Unexpected error');
        this.name = 'UnexpectedError';
        this.status = status;
    }
}

export type AppError =
    | BusinessError
    | ValidationError
    | UnauthorizedError
    | ForbiddenError
    | SessionExpiredError
    | RateLimitedError
    | NetworkError
    | UnexpectedError;

type DomainErrorBody = {
    error?: {
        code?: string;
        message?: string;
        context?: Record<string, unknown>;
    };
};

type ValidationErrorBody = {
    message?: string;
    errors?: Record<string, string[]>;
};

/**
 * A request made with `responseType: 'blob'` (a file download) gets its error
 * body as a Blob too, so `mapToAppError` would miss the domain envelope and
 * fall back to the status alone. Reading a JSON body back into `data` first
 * keeps the catalog copy (e.g. a suspended organization's 403).
 */
export async function readBlobErrorBody(error: unknown): Promise<unknown> {
    const data = axios.isAxiosError(error) ? error.response?.data : undefined;

    if (
        axios.isAxiosError(error) &&
        error.response &&
        data instanceof Blob &&
        data.type.includes('json')
    ) {
        try {
            error.response.data = JSON.parse(await data.text());
        } catch {
            // Not JSON after all: mapToAppError falls back to the status.
        }
    }

    return error;
}

/** With `readBlobErrorBody` and `errorDetailsFor`, the only code allowed to touch `axios.isAxiosError`/`error.response` — enforced by an ESLint rule. */
export function mapToAppError(error: unknown): AppError {
    if (!axios.isAxiosError(error)) {
        return new UnexpectedError();
    }

    if (!error.response) {
        return new NetworkError();
    }

    const { status, data } = error.response;

    // `data` can be null/undefined, so reads below use optional chaining — a bare `data.error` would throw instead of falling through.
    const envelope = data as DomainErrorBody | null | undefined;
    const code = envelope?.error?.code;
    if (typeof code === 'string') {
        return new BusinessError(
            code as ErrorCode,
            envelope?.error?.message ?? '',
            envelope?.error?.context ?? {},
            status,
        );
    }

    if (status === 422) {
        const validation = data as ValidationErrorBody | null | undefined;
        const fields = Object.fromEntries(
            Object.entries(validation?.errors ?? {}).map(
                ([field, messages]) => [field, messages[0]],
            ),
        );

        return new ValidationError(validation?.message ?? null, fields);
    }

    if (status === 401) {
        return new UnauthorizedError();
    }

    if (status === 403) {
        return new ForbiddenError();
    }

    if (status === 419) {
        return new SessionExpiredError();
    }

    if (status === 429) {
        return new RateLimitedError();
    }

    return new UnexpectedError(status);
}

/** Only for debug mode (#304): reads everything the error carries, the API's own debug body included. */
export function errorDetailsFor(error: unknown): ErrorDetails {
    if (!axios.isAxiosError(error) || !error.response) {
        return detailsFromThrown(error);
    }

    const { config, status, data } = error.response;

    return detailsFromResponse({
        method: config?.method ?? 'get',
        url: `${config?.baseURL ?? ''}${config?.url ?? ''}`,
        status,
        body: data,
        fallbackMessage: error.message,
    });
}
