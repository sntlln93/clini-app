import type { Prescription } from '@/types/prescription';

// Dashes instead of slashes: the tab title doubles as the suggested PDF file name.
function formatIssuedDate(iso: string): string {
    return new Date(iso)
        .toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })
        .replaceAll('/', '-');
}

/** Tab-title parts for a prescription: "Receta", the patient and the issue date. */
export function prescriptionTitleParts(
    prescription: Prescription | undefined,
): Array<string | null | undefined> {
    return [
        'Receta',
        prescription?.patient_name,
        prescription ? formatIssuedDate(prescription.issued_at) : undefined,
    ];
}
