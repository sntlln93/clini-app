import axios from 'axios';
import type { ErrorCode } from './error-codes';

/**
 * A business rule rejected the request. Carries the backend's
 * `ErrorCode` (public contract) and its own developer-facing `message`
 * (English) — never rendered to the user; UI copy is resolved by `code`
 * through `error-codes.ts`. `context` is whatever the backend's
 * `publicContext()` chose to expose (empty by default).
 */
export class BusinessError extends Error {
    readonly kind = 'business' as const;
    readonly code: ErrorCode;
    readonly context: Record<string, unknown>;

    constructor(
        code: ErrorCode,
        message: string,
        context: Record<string, unknown>,
    ) {
        super(message);
        this.name = 'BusinessError';
        this.code = code;
        this.context = context;
    }
}

/**
 * Laravel's native FormRequest input-validation shape (422), untouched by
 * the domain envelope — see ADR 0008. `fields` carries the first message
 * per field, same as the panel already showed before this module existed.
 */
export class ValidationError extends Error {
    readonly kind = 'validation' as const;
    readonly fields: Record<string, string>;
    /**
     * The backend's own `message`, verbatim, or `null` when the response
     * carried none — distinct from `Error.message` (which can't be `null`)
     * so callers can tell "no message" apart from a placeholder string.
     */
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

/** 429: login throttling. */
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

/** Anything else: an unexpected failure with no safe details to show. */
export class UnexpectedError extends Error {
    readonly kind = 'unexpected' as const;

    constructor() {
        super('Unexpected error');
        this.name = 'UnexpectedError';
    }
}

export type AppError =
    | BusinessError
    | ValidationError
    | UnauthorizedError
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
 * The only function in the panel allowed to call `axios.isAxiosError` or
 * read `error.response` — enforced by an ESLint rule. Every consumer works
 * with the typed `AppError` union instead, never with axios directly.
 */
export function mapToAppError(error: unknown): AppError {
    if (!axios.isAxiosError(error)) {
        return new UnexpectedError();
    }

    if (!error.response) {
        return new NetworkError();
    }

    const { status, data } = error.response;

    // `data` can be `null`/`undefined` (an empty response body), so every
    // read below goes through optional chaining — a bare `data.error` would
    // throw instead of falling through to the generic cases.
    const envelope = data as DomainErrorBody | null | undefined;
    const code = envelope?.error?.code;
    if (typeof code === 'string') {
        return new BusinessError(
            code as ErrorCode,
            envelope?.error?.message ?? '',
            envelope?.error?.context ?? {},
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

    if (status === 419) {
        return new SessionExpiredError();
    }

    if (status === 429) {
        return new RateLimitedError();
    }

    return new UnexpectedError();
}
