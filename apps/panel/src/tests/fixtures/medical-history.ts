import type {
    BloodTypeRecord,
    MedicalHistoryEntry,
} from '@/types/medical-history';

// An allergy by membership 1 on appointment 7, as the API answers it.
export function buildMedicalHistoryEntry(
    overrides: Partial<MedicalHistoryEntry> = {},
): MedicalHistoryEntry {
    const content = {
        description: 'Penicilina',
        reaction: 'Urticaria',
        severity: 'severe' as const,
        approximate_date: null,
    };

    return {
        id: 1,
        appointment_id: 7,
        patient_id: 10,
        membership_id: 1,
        category: 'allergy',
        created_at: '2026-10-01T13:00:00Z',
        version: 1,
        amended_at: null,
        ...content,
        withdrawal: null,
        versions: [
            {
                version: 1,
                reason: null,
                created_at: '2026-10-01T13:00:00Z',
                ...content,
            },
        ],
        author_name: 'Dra. Autora',
        ...overrides,
    };
}

export function buildBloodTypeRecord(
    overrides: Partial<BloodTypeRecord> = {},
): BloodTypeRecord {
    return {
        id: 1,
        appointment_id: 7,
        membership_id: 1,
        blood_type: 'O+',
        reason: null,
        created_at: '2026-10-01T13:00:00Z',
        author_name: 'Dra. Autora',
        ...overrides,
    };
}
