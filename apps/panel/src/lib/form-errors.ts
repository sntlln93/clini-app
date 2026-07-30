import { mapToAppError } from './api-errors';
import { messageForAppError, type ErrorCode } from './error-codes';

type FormErrors = {
    message: string | null;
    errors: Record<string, string>;
};

/**
 * Extracts form-friendly `{ message, errors }` from any error a mutation can
 * throw, over the typed `AppError` union (never axios directly).
 *
 * `fieldMap` is a per-form `código → campo` map: it lets a 409 business
 * error keep the same inline-on-field display the panel had when these
 * rules were still 422s. A code with no entry in the map — or no map at
 * all, for backward compatibility with existing call sites — falls back to
 * a general form message; it is never silently dropped.
 */
export function extractFormErrors(
    error: unknown,
    fieldMap: Partial<Record<ErrorCode, string>> = {},
): FormErrors {
    const appError = mapToAppError(error);

    if (appError.kind === 'validation') {
        return { message: appError.serverMessage, errors: appError.fields };
    }

    if (appError.kind === 'business') {
        const field = fieldMap[appError.code];
        const message = messageForAppError(appError);

        return field
            ? { message: null, errors: { [field]: message } }
            : { message, errors: {} };
    }

    return { message: messageForAppError(appError), errors: {} };
}
