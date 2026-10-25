/** What the error pages show in debug mode (#304): the exact error, where it happened and how it got there. */
export type ErrorDetails = {
    name: string;
    message: string;
    location: string | null;
    trace: string[];
    request: { method: string; url: string; status: number } | null;
};

/** Laravel's debug body (`APP_DEBUG=true`); absent fields mean the API didn't send them. */
type LaravelDebugBody = {
    message?: string;
    exception?: string;
    file?: string;
    line?: number;
    trace?: {
        file?: string;
        line?: number;
        class?: string;
        type?: string;
        function?: string;
    }[];
};

export function detailsFromResponse(response: {
    method: string;
    url: string;
    status: number;
    body: unknown;
    fallbackMessage: string;
}): ErrorDetails {
    const body = (response.body ?? {}) as LaravelDebugBody;

    return {
        name: body.exception ?? `HTTP ${response.status}`,
        message: body.message ?? response.fallbackMessage,
        location: body.file ? `${body.file}:${body.line ?? '?'}` : null,
        trace: (body.trace ?? []).map(
            (frame) =>
                `${frame.file ?? '[internal]'}:${frame.line ?? '?'} ${frame.class ?? ''}${frame.type ?? ''}${frame.function ?? ''}`,
        ),
        request: {
            method: response.method.toUpperCase(),
            url: response.url,
            status: response.status,
        },
    };
}

/** A crash in the page itself, or anything thrown that isn't an `Error`. */
export function detailsFromThrown(error: unknown): ErrorDetails {
    if (!(error instanceof Error)) {
        return {
            name: typeof error,
            message: String(error),
            location: null,
            trace: [],
            request: null,
        };
    }

    return {
        name: error.name,
        message: error.message,
        location: null,
        // V8 frames start with `at `, Firefox and Safari ones carry `@`; the
        // first V8 line only repeats name and message.
        trace: (error.stack ?? '')
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.startsWith('at ') || line.includes('@')),
        request: null,
    };
}
