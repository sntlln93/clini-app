import { describe, expect, it } from 'vitest';
import {
    EMPTY_VITAL_SIGN,
    hasNoValues,
    toPayload,
    vitalSignSchema,
    type VitalSignFormValues,
} from './vital-sign-schema';

function parse(values: Partial<VitalSignFormValues>) {
    return vitalSignSchema.safeParse({ ...EMPTY_VITAL_SIGN, ...values });
}

function messagesFor(values: Partial<VitalSignFormValues>, path: string) {
    const result = parse(values);

    return result.success
        ? []
        : result.error.issues
              .filter((issue) => issue.path.join('.') === path)
              .map((issue) => issue.message);
}

describe('vitalSignSchema', () => {
    it('needs at least one value', () => {
        expect(hasNoValues(EMPTY_VITAL_SIGN)).toBe(true);
        expect(hasNoValues({ ...EMPTY_VITAL_SIGN, weight_kg: ' ' })).toBe(true);
        expect(hasNoValues({ ...EMPTY_VITAL_SIGN, heart_rate_bpm: '72' })).toBe(
            false,
        );
    });

    it('takes a comma as the decimal separator, within the decimals allowed', () => {
        expect(parse({ weight_kg: '70,25' }).success).toBe(true);
        expect(
            messagesFor({ temperature_c: '36,55' }, 'temperature_c'),
        ).toEqual(['Ingresá un número con hasta un decimal.']);
        expect(
            messagesFor({ heart_rate_bpm: '72.5' }, 'heart_rate_bpm'),
        ).toEqual(['Ingresá un número entero.']);
    });

    it('refuses a value out of its plausible range, as the API does', () => {
        expect(
            messagesFor(
                { oxygen_saturation_pct: '101' },
                'oxygen_saturation_pct',
            ),
        ).toEqual(['Tiene que estar entre 50 y 100 %.']);
    });

    it('takes the blood pressure as both numbers, the diastolic below', () => {
        expect(messagesFor({ systolic_mmhg: '120' }, 'diastolic_mmhg')).toEqual(
            ['La presión lleva la sistólica y la diastólica.'],
        );
        expect(
            messagesFor(
                { systolic_mmhg: '80', diastolic_mmhg: '120' },
                'diastolic_mmhg',
            ),
        ).toEqual(['La diastólica tiene que ser menor que la sistólica.']);
        expect(
            parse({ systolic_mmhg: '120', diastolic_mmhg: '80' }).success,
        ).toBe(true);
    });

    it('sends numbers, null for every empty value and the reason only when written', () => {
        expect(
            toPayload({
                ...EMPTY_VITAL_SIGN,
                weight_kg: '70,5',
                heart_rate_bpm: '72',
            }),
        ).toMatchObject({
            weight_kg: 70.5,
            heart_rate_bpm: 72,
            height_cm: null,
            reason: null,
        });
    });
});
