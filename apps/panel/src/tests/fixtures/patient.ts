import type { Patient } from '@/types/patient';

export function buildPatient(overrides: Partial<Patient> = {}): Patient {
    return {
        id: 1,
        name: 'Ana Gómez',
        email: null,
        phone: null,
        document_type: 'dni',
        document_number: '30111222',
        sex: null,
        birth_date: null,
        insurance_provider_id: null,
        insurance_member_number: null,
        insurance_provider: null,
        created_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}
