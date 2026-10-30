import type {
    PatientContact,
    PatientContactDraft,
    PatientContactType,
} from '@/types/patient';

export const PATIENT_CONTACTS_MAX = 10;

export const CONTACT_TYPE_OPTIONS: {
    value: PatientContactType;
    label: string;
}[] = [
    { value: 'phone', label: 'Teléfono' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'email', label: 'Correo electrónico' },
];

export function contactTypeLabel(type: PatientContactType): string {
    return (
        CONTACT_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
        type
    );
}

export function emptyContactDraft(
    type: PatientContactType,
): PatientContactDraft {
    return { type, value: '', label: '' };
}

/** The editor's rows for saved contacts, written as a person reads them. */
export function contactDrafts(
    contacts: PatientContact[],
): PatientContactDraft[] {
    return contacts.map((contact) => ({
        type: contact.type,
        value: contact.display,
        label: contact.label ?? '',
        needs_confirmation: contact.needs_confirmation,
    }));
}

/**
 * The rows worth sending: an empty one is just an unused slot. `formIndex`
 * maps a sent row back to its row in the form, so the API's
 * `contacts.<n>.value` errors land on the row the user sees.
 */
export function contactsPayload(drafts: PatientContactDraft[]): {
    contacts: PatientContactDraft[];
    formIndex: number[];
} {
    const formIndex: number[] = [];
    const contacts: PatientContactDraft[] = [];

    drafts.forEach((draft, index) => {
        if (draft.value.trim() === '') {
            return;
        }

        formIndex.push(index);
        contacts.push({
            type: draft.type,
            value: draft.value.trim(),
            label: draft.label.trim(),
        });
    });

    return { contacts, formIndex };
}

/**
 * `{ '<prefix>.<sent index>.value': '<prefix>.<form index>.value' }` for
 * every field of every sent row, for `applyFormErrors`.
 */
export function contactErrorFieldMap(
    prefix: string,
    formIndex: number[],
): Record<string, string> {
    return Object.fromEntries(
        formIndex.flatMap((rowIndex, sentIndex) =>
            (['type', 'value', 'label'] as const).map((field) => [
                `${prefix}.${sentIndex}.${field}`,
                `${prefix}.${rowIndex}.${field}`,
            ]),
        ),
    );
}

/** The patient's main number, for a list: a phone, or else their WhatsApp. */
export function mainPhone(contacts: PatientContact[]): PatientContact | null {
    return (
        contacts.find((contact) => contact.type === 'phone') ??
        contacts.find((contact) => contact.type === 'whatsapp') ??
        null
    );
}

/**
 * Whether a typed contact is likely a saved one, however it was written: an
 * email without case, a number by its last 8 digits (the local number,
 * without the area code, 0, 15 or country code around it). The API decides
 * for real; this only keeps the form from repeating a contact (#365).
 */
export function sameContact(
    saved: PatientContact,
    typed: Pick<PatientContactDraft, 'type' | 'value'>,
): boolean {
    if (saved.type !== typed.type) {
        return false;
    }

    if (saved.type === 'email') {
        return saved.value === typed.value.trim().toLowerCase();
    }

    const digits = typed.value.replace(/\D/g, '');

    return digits.length >= 8 && saved.value.endsWith(digits.slice(-8));
}
