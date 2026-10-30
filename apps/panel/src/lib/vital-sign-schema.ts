import type {
    VitalSign,
    VitalSignAmendmentPayload,
    VitalSignValuesPayload,
} from '@/types/vital-sign';
import { z } from 'zod';
import { amendmentReason } from './clinical-note-schema';
import { VITAL_SIGN_FIELDS, VITAL_SIGN_INPUT_KEYS } from './vital-signs';

type InputKey = keyof VitalSignValuesPayload;

// Mirrors `StoreVitalSignRequest::RANGES` in the API — keep in sync.
const RANGES: Record<InputKey, [min: number, max: number]> = {
    weight_kg: [0.2, 500],
    height_cm: [20, 250],
    head_circumference_cm: [20, 80],
    waist_circumference_cm: [20, 250],
    systolic_mmhg: [40, 300],
    diastolic_mmhg: [20, 200],
    capillary_glucose_mg_dl: [10, 1000],
    heart_rate_bpm: [20, 300],
    respiratory_rate_rpm: [4, 100],
    temperature_c: [30, 45],
    oxygen_saturation_pct: [50, 100],
};

// A comma reads as the decimal separator, as people type it here.
export function parseDecimal(raw: string): number {
    return Number(raw.trim().replace(',', '.'));
}

// Kept as the raw input string so the field stays controlled; parsed on
// submit. Empty is fine: every value is optional.
function valueSchema(key: InputKey) {
    const [min, max] = RANGES[key];
    const { decimals, unit } = VITAL_SIGN_FIELDS[key];
    const pattern =
        decimals === 0
            ? /^\d+$/
            : new RegExp(`^\\d+([.,]\\d{1,${decimals}})?$`);

    return z
        .string()
        .trim()
        .refine(
            (raw) => raw === '' || pattern.test(raw),
            decimals === 0
                ? 'Ingresá un número entero.'
                : `Ingresá un número con hasta ${decimals === 1 ? 'un decimal' : `${decimals} decimales`}.`,
        )
        .refine(
            (raw) =>
                raw === '' ||
                !pattern.test(raw) ||
                (parseDecimal(raw) >= min && parseDecimal(raw) <= max),
            `Tiene que estar entre ${min} y ${max} ${unit}.`,
        );
}

const valuesShape = Object.fromEntries(
    VITAL_SIGN_INPUT_KEYS.map((key) => [key, valueSchema(key)]),
) as Record<InputKey, ReturnType<typeof valueSchema>>;

// A measurement holds at least one value: the form checks it on submit, since
// it belongs to no field.
export const NO_VALUES_MESSAGE = 'Cargá al menos un dato de la medición.';

export function hasNoValues(values: VitalSignFormValues): boolean {
    return VITAL_SIGN_INPUT_KEYS.every((key) => values[key].trim() === '');
}

// `reason` only goes out with an amendment; recording one ignores it.
export const vitalSignSchema = z
    .object({ ...valuesShape, reason: amendmentReason })
    .superRefine((values, ctx) => {
        const systolic = values.systolic_mmhg;
        const diastolic = values.diastolic_mmhg;

        if ((systolic === '') !== (diastolic === '')) {
            ctx.addIssue({
                code: 'custom',
                path: [systolic === '' ? 'systolic_mmhg' : 'diastolic_mmhg'],
                message: 'La presión lleva la sistólica y la diastólica.',
            });
        } else if (
            systolic !== '' &&
            parseDecimal(diastolic) >= parseDecimal(systolic)
        ) {
            ctx.addIssue({
                code: 'custom',
                path: ['diastolic_mmhg'],
                message: 'La diastólica tiene que ser menor que la sistólica.',
            });
        }
    });

export type VitalSignFormValues = z.infer<typeof vitalSignSchema>;

export const EMPTY_VITAL_SIGN = {
    ...Object.fromEntries(VITAL_SIGN_INPUT_KEYS.map((key) => [key, ''])),
    reason: '',
} as VitalSignFormValues;

export function toFormValues(vitalSign: VitalSign): VitalSignFormValues {
    return {
        ...Object.fromEntries(
            VITAL_SIGN_INPUT_KEYS.map((key) => {
                const value = vitalSign.values[key];

                return [key, value === null ? '' : String(value)];
            }),
        ),
        reason: '',
    } as VitalSignFormValues;
}

export function toPayload(
    values: VitalSignFormValues,
): VitalSignAmendmentPayload {
    return {
        ...(Object.fromEntries(
            VITAL_SIGN_INPUT_KEYS.map((key) => [
                key,
                values[key] === '' ? null : parseDecimal(values[key]),
            ]),
        ) as VitalSignValuesPayload),
        reason: values.reason.trim() || null,
    };
}

// Server validation keys this form can show inline.
export function isVitalSignFieldKey(key: string): key is InputKey | 'reason' {
    return (
        key === 'reason' ||
        (VITAL_SIGN_INPUT_KEYS as readonly string[]).includes(key)
    );
}
