import type { ClinicalRecordDocument } from '@/types/clinical-record';
import type { VitalSignValues } from '@/types/vital-sign';

const NO_VALUES: VitalSignValues = {
    weight_kg: null,
    height_cm: null,
    bmi: null,
    head_circumference_cm: null,
    waist_circumference_cm: null,
    systolic_mmhg: null,
    diastolic_mmhg: null,
    capillary_glucose_mg_dl: null,
    heart_rate_bpm: null,
    respiratory_rate_rpm: null,
    temperature_c: null,
    oxygen_saturation_pct: null,
};

// One patient's export as the API answers it: an amended note with a
// diagnosis, a colleague's annulled note, the exporter's annulled medication,
// the colleague's medication (#359), an amended measurement, the colleague's
// blood type and withdrawn allergy (#361), and a trail with an exceptional
// access and the export itself.
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
                                allergy_warning_overridden: false,
                            },
                        ],
                    },
                ],
                vital_signs: [
                    {
                        id: 41,
                        author: exporter,
                        measured_at: '2026-09-01T13:10:00Z',
                        annulment: null,
                        versions: [
                            {
                                version: 1,
                                author: exporter,
                                created_at: '2026-09-01T13:10:00Z',
                                reason: null,
                                values: {
                                    ...NO_VALUES,
                                    weight_kg: 80,
                                    height_cm: 180,
                                    bmi: 24.7,
                                },
                            },
                            {
                                version: 2,
                                author: exporter,
                                created_at: '2026-09-01T13:20:00Z',
                                reason: 'Balanza mal calibrada.',
                                values: {
                                    ...NO_VALUES,
                                    weight_kg: 78.5,
                                    height_cm: 180,
                                    bmi: 24.2,
                                },
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
                prescriptions: [
                    {
                        id: 22,
                        author: colleague,
                        issued_at: '2026-09-10T15:20:00Z',
                        created_at: '2026-09-10T15:20:00Z',
                        annulment: null,
                        versions: [
                            {
                                version: 1,
                                author: colleague,
                                created_at: '2026-09-10T15:20:00Z',
                                reason: null,
                                items: [
                                    {
                                        medication: 'Paracetamol',
                                        presentation: null,
                                        dosage: 'Si hay fiebre',
                                        quantity: 1,
                                    },
                                ],
                                allergy_warning_overridden: false,
                            },
                        ],
                    },
                ],
                vital_signs: [],
            },
        ],
        blood_types: [
            {
                id: 51,
                appointment_id: 2,
                author: colleague,
                created_at: '2026-09-10T15:25:00Z',
                blood_type: 'O+',
                reason: null,
            },
        ],
        medical_history: [
            {
                id: 61,
                appointment_id: 2,
                category: 'allergy',
                author: colleague,
                created_at: '2026-09-10T15:26:00Z',
                withdrawal: {
                    author: colleague,
                    reason: 'Ya no la tiene.',
                    created_at: '2026-09-10T15:40:00Z',
                },
                versions: [
                    {
                        version: 1,
                        author: colleague,
                        created_at: '2026-09-10T15:26:00Z',
                        reason: null,
                        description: 'Penicilina',
                        reaction: 'Urticaria',
                        severity: 'severe',
                        approximate_date: null,
                    },
                ],
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
                vital_sign_id: null,
                blood_type_record_id: null,
                medical_history_entry_id: null,
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
                vital_sign_id: null,
                blood_type_record_id: null,
                medical_history_entry_id: null,
                export: { id: 9, scope: 'patient', format: 'pdf' },
            },
        ],
        ...overrides,
    };
}
