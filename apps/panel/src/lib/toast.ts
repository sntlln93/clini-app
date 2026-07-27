import axios from 'axios';
import { toast } from 'sonner';

/**
 * Panel-wide convention for async feedback: call these two helpers from a
 * mutation's `onSuccess`/`onError` to notify the user, instead of rolling a
 * one-off toast call at the call site.
 */
export function notifySuccess(message: string): void {
    toast.success(message);
}

export function notifyError(error: unknown, fallback: string): void {
    const message =
        axios.isAxiosError<{ message?: string }>(error) &&
        error.response?.data.message
            ? error.response.data.message
            : fallback;

    toast.error(message);
}
