import type { PatientPayload } from '@/types/patient';

const DOCUMENT_NUMBER = /^[\d.\s]+$/;

/**
 * The search that found nobody seeds the new patient's form: digits (dots and
 * spaces allowed, as in "30.111.222") go to the document number, anything else
 * to the name.
 */
export function patientPrefillFromSearch(
    search: string | null,
): Partial<PatientPayload> {
    const value = search?.trim() ?? '';

    if (value === '') {
        return {};
    }

    if (DOCUMENT_NUMBER.test(value)) {
        return { document_number: value.replace(/[.\s]/g, '') };
    }

    return { name: value };
}
