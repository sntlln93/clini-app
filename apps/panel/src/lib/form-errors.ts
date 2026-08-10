import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';
import { mapToAppError } from './api-errors';
import { messageForAppError, type ErrorCode } from './error-codes';

type FormErrors = {
    message: string | null;
    errors: Record<string, string>;
};

/**
 * Extracts `{ message, errors }` from any error a mutation can throw.
 * `fieldMap` maps code → field so a 409 keeps the inline-on-field display
 * these rules had as 422s; a code absent from the map (or no map at all)
 * falls back to a general message — never silently dropped.
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

/**
 * Applies `{ message, errors }` (from `extractFormErrors`) onto `form`: mapped
 * keys go to their field, and `root` is only set from `message` when `errors`
 * is empty — otherwise from the first unmapped key, since `message` may just
 * duplicate a field already shown.
 */
export function applyFormErrors<TFieldValues extends FieldValues>(
    form: UseFormReturn<TFieldValues>,
    { message, errors }: FormErrors,
    fieldMap: Record<string, FieldPath<TFieldValues>>,
): void {
    let firstUnconsumed: string | null = null;

    for (const [key, errorMessage] of Object.entries(errors)) {
        const field = fieldMap[key];

        if (field) {
            form.setError(field, { message: errorMessage });
        } else if (firstUnconsumed === null) {
            firstUnconsumed = errorMessage;
        }
    }

    if (Object.keys(errors).length === 0) {
        if (message) {
            form.setError('root', { message });
        }
        return;
    }

    if (firstUnconsumed !== null) {
        form.setError('root', { message: firstUnconsumed });
    }
}
