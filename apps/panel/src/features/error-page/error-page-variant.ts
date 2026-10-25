import type { AppError } from '@/lib/api-errors';

/** One page per situation the user can act on (#304). */
export type ErrorPageVariant =
    | 'bad_request'
    | 'unauthorized'
    | 'forbidden'
    | 'not_found'
    | 'timeout'
    | 'session_expired'
    | 'rate_limited'
    | 'server'
    | 'unavailable'
    | 'offline';

function variantForStatus(status: number): ErrorPageVariant {
    if (status === 401) {
        return 'unauthorized';
    }

    if (status === 403) {
        return 'forbidden';
    }

    if (status === 404 || status === 410) {
        return 'not_found';
    }

    if (status === 408) {
        return 'timeout';
    }

    if (status === 419) {
        return 'session_expired';
    }

    if (status === 429) {
        return 'rate_limited';
    }

    if (status === 502 || status === 503 || status === 504) {
        return 'unavailable';
    }

    return status >= 500 ? 'server' : 'bad_request';
}

/** `online` is `navigator.onLine`: with no response at all, it tells a dropped connection from an API that doesn't answer. */
export function errorPageVariantFor(
    error: AppError,
    online: boolean,
): ErrorPageVariant {
    switch (error.kind) {
        case 'unauthorized':
            return 'unauthorized';
        case 'forbidden':
            return 'forbidden';
        case 'session_expired':
            return 'session_expired';
        case 'rate_limited':
            return 'rate_limited';
        case 'validation':
            return 'bad_request';
        case 'network':
            return online ? 'unavailable' : 'offline';
        case 'business':
            return variantForStatus(error.status);
        case 'unexpected':
            // No response: a crash in the page, or a code chunk that couldn't load offline.
            if (error.status === null) {
                return online ? 'server' : 'offline';
            }

            return variantForStatus(error.status);
    }
}

/** The status the eyebrow shows, when there was a response to have one. */
export function errorStatusOf(error: AppError): number | null {
    switch (error.kind) {
        case 'unauthorized':
            return 401;
        case 'forbidden':
            return 403;
        case 'session_expired':
            return 419;
        case 'rate_limited':
            return 429;
        case 'validation':
            return 422;
        case 'network':
            return null;
        case 'business':
        case 'unexpected':
            return error.status;
    }
}
