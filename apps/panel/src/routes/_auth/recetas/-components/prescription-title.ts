import { fromInstant } from '@/lib/datetime';
import type { Prescription } from '@/types/prescription';

// Dashes instead of slashes: the tab title doubles as the suggested PDF file name.
function formatIssuedDate(iso: string): string {
    return fromInstant(iso).toFormat('dd-MM-yyyy');
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
