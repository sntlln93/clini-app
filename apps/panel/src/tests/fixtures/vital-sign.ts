import type { VitalSign, VitalSignValues } from '@/types/vital-sign';

export const NO_VITAL_SIGN_VALUES: VitalSignValues = {
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

// A measurement by membership 1 on appointment 7, as the API answers it.
export function buildVitalSign(
    overrides: Partial<Omit<VitalSign, 'values'>> & {
        values?: Partial<VitalSignValues>;
    } = {},
): VitalSign {
    const { values: valueOverrides, ...rest } = overrides;
    const values = {
        ...NO_VITAL_SIGN_VALUES,
        weight_kg: 70.5,
        height_cm: 170,
        bmi: 24.4,
        ...valueOverrides,
    };
    const measuredAt = rest.measured_at ?? '2026-10-01T13:00:00Z';

    return {
        id: 1,
        appointment_id: 7,
        patient_id: 10,
        membership_id: 1,
        measured_at: measuredAt,
        version: 1,
        amended_at: null,
        values,
        annulment: null,
        versions: [
            { version: 1, reason: null, created_at: measuredAt, values },
        ],
        author_name: 'Dra. Autora',
        ...rest,
    };
}
