import {
    sendContactRequest,
    type ContactRequest,
    type FieldErrors,
} from '@/lib/contact';
import { useState } from 'react';

// Mirrors the API's EMAIL rule closely enough to catch a typo before the
// request; the API still has the last word.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FORM_ERRORS = {
    rate_limited:
        'Hiciste demasiados envíos seguidos. Esperá unos minutos y volvé a intentar.',
    unexpected:
        'No pudimos enviar tu consulta. Revisá tu conexión y volvé a intentar.',
} as const;

export type ContactFormState =
    | { status: 'editing'; submitting: boolean }
    | { status: 'sent'; name: string; email: string };

/** Required fields and the email shape, checked before spending a request (the endpoint is rate limited). */
export function validateContactRequest(request: ContactRequest): FieldErrors {
    const errors: FieldErrors = {};

    if (request.name.trim() === '') {
        errors.name = 'Ingresá tu nombre.';
    }
    if (request.email.trim() === '') {
        errors.email = 'Ingresá tu correo.';
    } else if (!EMAIL_PATTERN.test(request.email.trim())) {
        errors.email = 'Ingresá un correo válido.';
    }
    if (request.message.trim() === '') {
        errors.message = 'Contanos en qué te podemos ayudar.';
    }

    return errors;
}

export function useContactForm() {
    const [state, setState] = useState<ContactFormState>({
        status: 'editing',
        submitting: false,
    });
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);

    async function submit(request: ContactRequest) {
        const errors = validateContactRequest(request);
        setFieldErrors(errors);
        setFormError(null);
        if (Object.keys(errors).length > 0) {
            return;
        }

        setState({ status: 'editing', submitting: true });
        const result = await sendContactRequest(request);

        if (result.ok) {
            setState({
                status: 'sent',
                name: request.name.trim(),
                email: request.email.trim(),
            });
            return;
        }

        setState({ status: 'editing', submitting: false });
        if (result.kind === 'validation') {
            setFieldErrors(result.fieldErrors);
        } else {
            setFormError(FORM_ERRORS[result.kind]);
        }
    }

    return { state, fieldErrors, formError, submit };
}
