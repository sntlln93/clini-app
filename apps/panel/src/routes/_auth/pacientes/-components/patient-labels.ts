import type { Patient } from '@/types/patient';

export const DOCUMENT_TYPE_LABELS: Record<Patient['document_type'], string> = {
    dni: 'DNI',
    passport: 'Pasaporte',
};

export function documentLabel({
    document_type,
    document_number,
}: Pick<Patient, 'document_type' | 'document_number'>): string {
    return `${DOCUMENT_TYPE_LABELS[document_type]} ${document_number}`;
}
