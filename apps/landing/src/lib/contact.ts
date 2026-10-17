import type { PlanId } from '@/routes/-components/plans';

// Baked at build time (Dockerfile build arg). The contact form is the
// landing's only call to the API (ADR 0011).
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/** The landing's plan ids are Spanish; the API speaks the plan enum. */
const API_PLANS: Record<PlanId, string> = {
    free: 'free',
    consultorio: 'practice',
    centro: 'center',
};

export const CONTACT_FIELDS = [
    'name',
    'email',
    'phone',
    'organization_name',
    'team_size',
    'plan',
    'message',
] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

export type ContactRequest = {
    name: string;
    email: string;
    phone: string;
    organizationName: string;
    teamSize: string;
    /** null = the visitor doesn't know yet. */
    plan: PlanId | null;
    message: string;
    /** The honeypot: hidden from people, so only a bot fills it. */
    website: string;
};

export type FieldErrors = Partial<Record<ContactField, string>>;

export type ContactResult =
    | { ok: true }
    | { ok: false; kind: 'validation'; fieldErrors: FieldErrors }
    | { ok: false; kind: 'rate_limited' | 'unexpected' };

function blankToNull(value: string): string | null {
    const trimmed = value.trim();

    return trimmed === '' ? null : trimmed;
}

/** The first message of each field the API rejected (a 422's `errors`). */
function fieldErrorsFrom(body: unknown): FieldErrors {
    const errors =
        typeof body === 'object' && body !== null && 'errors' in body
            ? body.errors
            : null;
    const fieldErrors: FieldErrors = {};

    if (typeof errors !== 'object' || errors === null) {
        return fieldErrors;
    }

    for (const field of CONTACT_FIELDS) {
        const messages: unknown = Reflect.get(errors, field);
        if (Array.isArray(messages) && typeof messages[0] === 'string') {
            fieldErrors[field] = messages[0];
        }
    }

    return fieldErrors;
}

/**
 * Sends the form to the public endpoint. No cookies (`credentials: 'omit'`):
 * the landing is not a Sanctum stateful origin, so the request is stateless.
 */
export async function sendContactRequest(
    request: ContactRequest,
): Promise<ContactResult> {
    let response: Response;

    try {
        response = await fetch(`${API_URL}/api/v1/contact`, {
            method: 'POST',
            credentials: 'omit',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: request.name.trim(),
                email: request.email.trim(),
                phone: blankToNull(request.phone),
                organization_name: blankToNull(request.organizationName),
                team_size: blankToNull(request.teamSize),
                plan: request.plan === null ? null : API_PLANS[request.plan],
                message: request.message.trim(),
                website: blankToNull(request.website),
            }),
        });
    } catch {
        return { ok: false, kind: 'unexpected' };
    }

    if (response.ok) {
        return { ok: true };
    }
    if (response.status === 429) {
        return { ok: false, kind: 'rate_limited' };
    }
    if (response.status === 422) {
        const fieldErrors = fieldErrorsFrom(
            await response.json().catch(() => null),
        );
        if (Object.keys(fieldErrors).length > 0) {
            return { ok: false, kind: 'validation', fieldErrors };
        }
    }

    return { ok: false, kind: 'unexpected' };
}
