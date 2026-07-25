import axios from 'axios';

type FormErrors = {
    message: string | null;
    errors: Record<string, string>;
};

const GENERIC_ERROR_MESSAGE =
    'Ocurrió un error inesperado. Intentá nuevamente.';

export function extractFormErrors(error: unknown): FormErrors {
    if (!axios.isAxiosError(error) || error.response?.status !== 422) {
        return { message: GENERIC_ERROR_MESSAGE, errors: {} };
    }

    const data = error.response.data as {
        message?: string;
        errors?: Record<string, string[]>;
    };

    const errors = Object.fromEntries(
        Object.entries(data.errors ?? {}).map(([field, messages]) => [
            field,
            messages[0],
        ]),
    );

    return { message: data.message ?? null, errors };
}
