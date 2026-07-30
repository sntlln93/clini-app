import { toast } from 'sonner';
import { mapToAppError } from './api-errors';
import { messageForAppError } from './error-codes';

/**
 * Panel-wide convention for async feedback: call these two helpers from a
 * mutation's `onSuccess`/`onError` to notify the user, instead of rolling a
 * one-off toast call at the call site.
 */
export function notifySuccess(message: string): void {
    toast.success(message);
}

/**
 * `fallback` is used whenever the error has nothing useful of its own to
 * say: an `UnexpectedError`, or a `ValidationError` whose response carried
 * no top-level message. A `BusinessError` always shows its own code's
 * catalog copy instead — never the backend's own `message`.
 */
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
