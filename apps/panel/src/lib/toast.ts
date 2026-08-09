import { toast } from 'sonner';
import { mapToAppError } from './api-errors';
import { messageForAppError } from './error-codes';

/** Call from a mutation's `onSuccess`/`onError`, instead of a one-off toast at the call site. */
export function notifySuccess(message: string): void {
    toast.success(message);
}

/** `fallback` covers errors with nothing of their own to say (`UnexpectedError`, or a `ValidationError` with no message); a `BusinessError` always shows its catalog copy instead. */
export function notifyError(error: unknown, fallback: string): void {
    const appError = mapToAppError(error);

    if (appError.kind === 'unexpected') {
        toast.error(fallback);
        return;
    }

    if (appError.kind === 'validation') {
        toast.error(appError.serverMessage ?? fallback);
        return;
    }

    toast.error(messageForAppError(appError));
}
