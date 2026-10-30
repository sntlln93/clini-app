import type {
    VitalSign,
    VitalSignValues,
    VitalSignValuesPayload,
} from '@/types/vital-sign';

export type VitalSignField = keyof VitalSignValues;

type FieldDefinition = {
    label: string;
    unit: string;
    // Followed over time (evolution chart) or read at the consultation.
    tracked: boolean;
    decimals: number;
};

// Every value a measurement holds (#361), in the order the page shows them.
// The ranges live in `vital-sign-schema.ts`, mirroring the API's.
export const VITAL_SIGN_FIELDS: Record<VitalSignField, FieldDefinition> = {
    weight_kg: { label: 'Peso', unit: 'kg', tracked: true, decimals: 2 },
    height_cm: { label: 'Altura', unit: 'cm', tracked: true, decimals: 1 },
    bmi: { label: 'IMC', unit: 'kg/m²', tracked: true, decimals: 1 },
    head_circumference_cm: {
        label: 'Perímetro cefálico',
        unit: 'cm',
        tracked: true,
        decimals: 1,
    },
    waist_circumference_cm: {
        label: 'Perímetro de cintura',
        unit: 'cm',
        tracked: true,
        decimals: 1,
    },
    systolic_mmhg: {
        label: 'Presión sistólica',
        unit: 'mmHg',
        tracked: true,
        decimals: 0,
    },
    diastolic_mmhg: {
        label: 'Presión diastólica',
        unit: 'mmHg',
        tracked: true,
        decimals: 0,
    },
    capillary_glucose_mg_dl: {
        label: 'Glucemia capilar',
        unit: 'mg/dL',
        tracked: true,
        decimals: 0,
    },
    heart_rate_bpm: {
        label: 'Frecuencia cardíaca',
        unit: 'lpm',
        tracked: false,
        decimals: 0,
    },
    respiratory_rate_rpm: {
        label: 'Frecuencia respiratoria',
        unit: 'rpm',
        tracked: false,
        decimals: 0,
    },
    temperature_c: {
        label: 'Temperatura',
        unit: '°C',
        tracked: false,
        decimals: 1,
    },
    oxygen_saturation_pct: {
        label: 'Saturación de O₂',
        unit: '%',
        tracked: false,
        decimals: 0,
    },
};

export const VITAL_SIGN_FIELD_KEYS = Object.keys(
    VITAL_SIGN_FIELDS,
) as VitalSignField[];

// What the form sends: every value but the BMI, which the API computes.
export const VITAL_SIGN_INPUT_KEYS = VITAL_SIGN_FIELD_KEYS.filter(
    (key): key is keyof VitalSignValuesPayload => key !== 'bmi',
);

export const TRACKED_FIELDS = VITAL_SIGN_FIELD_KEYS.filter(
    (key) => VITAL_SIGN_FIELDS[key].tracked,
);

const numberFormats = new Map<number, Intl.NumberFormat>();

// Spanish decimals («70,5»), trimmed: a weight of 70 reads «70», not «70,00».
export function formatVitalSignValue(
    field: VitalSignField,
    value: number,
): string {
    const { decimals, unit } = VITAL_SIGN_FIELDS[field];
    let format = numberFormats.get(decimals);

    if (format === undefined) {
        format = new Intl.NumberFormat('es-AR', {
            maximumFractionDigits: decimals,
        });
        numberFormats.set(decimals, format);
    }

    return `${format.format(value)} ${unit}`;
}

// The values a measurement holds, in the page's order, as «Peso 70,5 kg».
export function presentValues(
    values: VitalSignValues,
): { field: VitalSignField; label: string; value: string }[] {
    return VITAL_SIGN_FIELD_KEYS.flatMap((field) => {
        const value = values[field];

        return value === null
            ? []
            : [
                  {
                      field,
                      label: VITAL_SIGN_FIELDS[field].label,
                      value: formatVitalSignValue(field, value),
                  },
              ];
    });
}

// An annulled measurement leaves the series (#361).
export function countingMeasurements(vitalSigns: VitalSign[]): VitalSign[] {
    return vitalSigns.filter((vitalSign) => vitalSign.annulment === null);
}

// Each value's latest reading, with when it was taken: the newest
// measurement may not hold every value. `vitalSigns` come newest first.
export function latestValues(
    vitalSigns: VitalSign[],
): { field: VitalSignField; value: number; measuredAt: string }[] {
    const counting = countingMeasurements(vitalSigns);

    return VITAL_SIGN_FIELD_KEYS.flatMap((field) => {
        const latest = counting.find(
            (vitalSign) => vitalSign.values[field] !== null,
        );
        const value = latest?.values[field];

        return latest === undefined || value === null || value === undefined
            ? []
            : [{ field, value, measuredAt: latest.measured_at }];
    });
}

// One value's series for the evolution chart, oldest first.
export function seriesOf(
    vitalSigns: VitalSign[],
    field: VitalSignField,
): { measuredAt: string; value: number }[] {
    return countingMeasurements(vitalSigns)
        .flatMap((vitalSign) => {
            const value = vitalSign.values[field];

            return value === null
                ? []
                : [{ measuredAt: vitalSign.measured_at, value }];
        })
        .reverse();
}
