import type { ClinicalRecordDocument } from '@/types/clinical-record';

// One patient's export as the API answers it: an amended note with a
// diagnosis, a colleague's annulled note, the exporter's medication, annulled
// once no longer needed, and a trail with an exceptional access and the export itself.
export function buildClinicalRecord(
    overrides: Partial<ClinicalRecordDocument> = {},
): ClinicalRecordDocument {
    const exporter = { membership_id: 4, name: 'Dra. Exportadora' };
    const colleague = { membership_id: 5, name: 'Dr. Colega' };

    return {
        export: {
            id: 9,
            generated_at: '2026-10-20T13:30:00Z',
            organization: 'Consultorio Norte',
            generated_by: exporter,
            scope: 'patient',
            notice: 'Este documento no es una receta.',
        },
        patient: {
            id: 10,
            name: 'Paciente Compartido',
            document_type: 'dni',
            document_number: '30111222',
            sex: 'f',
            birth_date: '1990-03-14',
            insurance_provider: 'OSDE',
            insurance_member_number: '61234',
        },
        appointments: [
            {
                id: 1,
                start_at: '2026-09-01T13:00:00Z',
                end_at: '2026-09-01T13:30:00Z',
                status: 'completed',
                professional: exporter,
                service: 'Consulta',
                reason: 'Control',
                cancelled_at: null,
                cancellation_reason: null,
                clinical_notes: [
                    {
                        id: 11,
                        author: exporter,
                        created_at: '2026-09-01T13:20:00Z',
                        annulment: null,
                        versions: [
                            {
                                version: 1,
                                author: exporter,
                                created_at: '2026-09-01T13:20:00Z',
                                reason: null,
                                body: 'Primera versión de la nota.',
                                diagnoses: [],
                            },
                            {
                                version: 2,
                                author: exporter,
                                created_at: '2026-09-02T12:00:00Z',
                                reason: 'Faltaba un dato.',
                                body: 'Nota enmendada.',
                                diagnoses: [
                                    {
                                        code: 'J06.9',
                                        description:
                                            'Infección aguda de las vías respiratorias superiores',
                                    },
                                ],
                            },
                        ],
                    },
                ],
                prescriptions: [
                    {
                        id: 21,
                        author: exporter,
                        issued_at: '2026-09-01T13:25:00Z',
                        created_at: '2026-09-01T13:25:00Z',
                        annulment: {
                            author: exporter,
                            kind: 'no_longer_needed',
                            reason: 'Terminó el tratamiento.',
                            created_at: '2026-09-08T12:00:00Z',
                        },
                        versions: [
                            {
                                version: 1,
                                author: exporter,
                                created_at: '2026-09-01T13:25:00Z',
                                reason: null,
                                items: [
                                    {
                                        medication: 'Ibuprofeno',
                                        presentation: 'Comprimidos 400 mg',
                                        dosage: '1 cada 8 h',
                                        quantity: 2,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 2,
                start_at: '2026-09-10T15:00:00Z',
                end_at: '2026-09-10T15:30:00Z',
                status: 'completed',
                professional: colleague,
                service: null,
                reason: null,
                cancelled_at: null,
                cancellation_reason: null,
                clinical_notes: [
                    {
                        id: 12,
                        author: colleague,
                        created_at: '2026-09-10T15:10:00Z',
                        annulment: {
                            author: colleague,
                            reason: 'Paciente equivocado.',
                            created_at: '2026-09-11T10:00:00Z',
                        },
                        versions: [
                            {
                                version: 1,
                                author: colleague,
                                created_at: '2026-09-10T15:10:00Z',
                                reason: null,
                                body: 'Nota del colega.',
                                diagnoses: [],
                            },
                        ],
                    },
                ],
                prescriptions: [],
            },
        ],
        access_log: [
            {
                id: 31,
                created_at: '2026-10-20T13:00:00Z',
                action: 'exceptional_access',
                professional: exporter,
                reason: 'preparing_consultation',
                appointment: null,
                clinical_note_id: null,
                prescription_id: null,
                export: null,
            },
            {
                id: 32,
                created_at: '2026-10-20T13:30:00Z',
                action: 'record_exported',
                professional: exporter,
                reason: null,
                appointment: null,
                clinical_note_id: null,
                prescription_id: null,
                export: { id: 9, scope: 'patient', format: 'pdf' },
            },
        ],
        ...overrides,
    };
}
