import bmiForAge from './data/bmi-for-age.json';
import headCircumferenceForAge from './data/head-circumference-for-age.json';
import lengthHeightForAge from './data/length-height-for-age.json';
import weightForAge from './data/weight-for-age.json';

// The WHO growth curves (#363): the 2006 Child Growth Standards up to five
// years and the 2007 Growth Reference from five to nineteen, as L, M and S
// by age in days (data/README.md says where each table comes from).
export type GrowthIndicator =
    | 'weight-for-age'
    | 'length-height-for-age'
    | 'bmi-for-age'
    | 'head-circumference-for-age';

export type GrowthSex = 'male' | 'female';

type LmsRow = readonly number[];

export const DAYS_PER_MONTH = 30.4375;

const TABLES: Record<GrowthIndicator, Record<GrowthSex, LmsRow[]>> = {
    'weight-for-age': weightForAge,
    'length-height-for-age': lengthHeightForAge,
    'bmi-for-age': bmiForAge,
    'head-circumference-for-age': headCircumferenceForAge,
};

// The centiles the chart draws, each with the z-score it sits on.
export const CENTILES = [
    { key: 'p3', percentile: 3, z: -1.8807936081512509 },
    { key: 'p15', percentile: 15, z: -1.0364333894937894 },
    { key: 'p50', percentile: 50, z: 0 },
    { key: 'p85', percentile: 85, z: 1.0364333894937894 },
    { key: 'p97', percentile: 97, z: 1.8807936081512509 },
] as const;

export type CentileKey = (typeof CENTILES)[number]['key'];

type Lms = { l: number; m: number; s: number };

/** The last age, in days, the WHO publishes the indicator for. */
export function lastAgeOf(indicator: GrowthIndicator): number {
    const rows = TABLES[indicator].male;

    return rows[rows.length - 1][0];
}

/** Every age the table holds, the points the chart draws its curves through. */
export function tableAgesOf(indicator: GrowthIndicator): number[] {
    return TABLES[indicator].male.map(([age]) => age);
}

// Linear between the two rows around the age, as the WHO's own software
// does between the days or months it publishes; null outside the table.
function lmsAt(
    indicator: GrowthIndicator,
    sex: GrowthSex,
    ageDays: number,
): Lms | null {
    const rows = TABLES[indicator][sex];
    const after = rows.findIndex(([age]) => age >= ageDays);

    if (ageDays < 0 || after === -1) {
        return null;
    }

    const [ageB, lB, mB, sB] = rows[after];

    if (ageB === ageDays || after === 0) {
        return { l: lB, m: mB, s: sB };
    }

    const [ageA, lA, mA, sA] = rows[after - 1];
    const t = (ageDays - ageA) / (ageB - ageA);

    return {
        l: lA + t * (lB - lA),
        m: mA + t * (mB - mA),
        s: sA + t * (sB - sA),
    };
}

function valueAt({ l, m, s }: Lms, z: number): number {
    return l === 0 ? m * Math.exp(s * z) : m * (1 + l * s * z) ** (1 / l);
}

function zScoreOf({ l, m, s }: Lms, value: number): number {
    return l === 0 ? Math.log(value / m) / s : ((value / m) ** l - 1) / (l * s);
}

// Abramowitz & Stegun 7.1.26: within 1.5e-7, far below a displayed point.
function normalCdf(z: number): number {
    const x = Math.abs(z) / Math.SQRT2;
    const t = 1 / (1 + 0.3275911 * x);
    const poly =
        t *
        (0.254829592 +
            t *
                (-0.284496736 +
                    t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
    const erf = 1 - poly * Math.exp(-x * x);

    return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/** The value of each drawn centile at the age, or null outside the table. */
export function centilesAt(
    indicator: GrowthIndicator,
    sex: GrowthSex,
    ageDays: number,
): Record<CentileKey, number> | null {
    const lms = lmsAt(indicator, sex, ageDays);

    if (lms === null) {
        return null;
    }

    return Object.fromEntries(
        CENTILES.map(({ key, z }) => [key, valueAt(lms, z)]),
    ) as Record<CentileKey, number>;
}

/**
 * The measurement's percentile (0–100), or null outside the table. Beyond
 * ±3 SD the WHO corrects the z-score of weight and BMI; the percentile is
 * shown as «< P1» or «> P99» there anyway, so the plain one is enough.
 */
export function percentileOf(
    indicator: GrowthIndicator,
    sex: GrowthSex,
    ageDays: number,
    value: number,
): number | null {
    const lms = lmsAt(indicator, sex, ageDays);

    return lms === null || value <= 0
        ? null
        : normalCdf(zScoreOf(lms, value)) * 100;
}

/** «P42», or «< P1» and «> P99» at the ends, where a whole number lies. */
export function formatPercentile(percentile: number): string {
    if (percentile < 1) {
        return '< P1';
    }

    if (percentile > 99) {
        return '> P99';
    }

    return `P${Math.round(percentile)}`;
}
