// The values of one measurement (#361), every one optional. The BMI is never
// stored: the API computes it from the same version's weight and height.
// Mirrors `VitalSignResource::values()`.
export type VitalSignValues = {
    weight_kg: number | null;
    height_cm: number | null;
    bmi: number | null;
    head_circumference_cm: number | null;
    waist_circumference_cm: number | null;
    systolic_mmhg: number | null;
    diastolic_mmhg: number | null;
    capillary_glucose_mg_dl: number | null;
    heart_rate_bpm: number | null;
    respiratory_rate_rpm: number | null;
    temperature_c: number | null;
    oxygen_saturation_pct: number | null;
};

// What the form sends: every value but the computed BMI.
export type VitalSignValuesPayload = Omit<VitalSignValues, 'bmi'>;

export type VitalSignVersion = {
    version: number;
    reason: string | null;
    created_at: string;
    values: VitalSignValues;
};

// A measurement taken during one appointment, part of the clinical history:
// append-only (ADR 0019), so `values` are the current version's and
// `versions` holds every one, oldest first. An amendment corrects the same
// point of the series; an annulled one leaves the series but stays.
export type VitalSign = {
    id: number;
    appointment_id: number;
    patient_id: number;
    membership_id: number;
    measured_at: string;
    version: number;
    amended_at: string | null;
    values: VitalSignValues;
    annulment: { reason: string; created_at: string } | null;
    versions: VitalSignVersion[];
    author_name: string | null;
};

export type VitalSignAmendmentPayload = VitalSignValuesPayload & {
    reason: string | null;
};
