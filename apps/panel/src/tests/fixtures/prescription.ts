import type { Prescription, PrescriptionItem } from '@/types/prescription';

export const AMOXICILLIN: PrescriptionItem = {
    id: 1,
    position: 0,
    medication: 'Amoxicilina',
    presentation: 'Comprimidos 500 mg',
    dosage: '1 cada 8 h por 7 días',
    quantity: 2,
};

/** Shared record fixture: one version whose items are `items`, unless `versions` says otherwise. */
export function buildPrescription(
    overrides: Partial<Prescription> = {},
): Prescription {
    const items = overrides.items ?? [AMOXICILLIN];
    const issuedAt = overrides.issued_at ?? '2026-08-03T10:15:00Z';

    return {
        id: 7,
        appointment_id: 42,
        patient_id: 50,
        membership_id: 1,
        issued_at: issuedAt,
        created_at: issuedAt,
        version: 1,
        amended_at: null,
        items,
        annulment: null,
        versions: [{ version: 1, reason: null, created_at: issuedAt, items }],
        ...overrides,
    };
}
