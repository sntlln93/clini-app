import { fromInstant } from '@/lib/datetime';
import {
    centilesAt,
    DAYS_PER_MONTH,
    lastAgeOf,
    percentileOf,
    tableAgesOf,
    type CentileKey,
    type GrowthIndicator,
    type GrowthSex,
} from '@/lib/growth-standards/who-growth';
import type { VitalSignField } from '@/lib/vital-signs';
import type { Patient } from '@/types/patient';
import { ageInDaysOn, formatAgeOn } from './patient-age';

export type GrowthPatient = Pick<Patient, 'birth_date' | 'sex'>;

// The followed values the WHO has curves for (#363).
const GROWTH_INDICATORS: Partial<Record<VitalSignField, GrowthIndicator>> = {
    weight_kg: 'weight-for-age',
    height_cm: 'length-height-for-age',
    bmi: 'bmi-for-age',
    head_circumference_cm: 'head-circumference-for-age',
};

// The curves reach nineteen years: the last age of the 2007 reference.
const LAST_CURVE_AGE = lastAgeOf('bmi-for-age');

export const GROWTH_UNAVAILABLE = {
    birthDate:
        'Para ver las curvas de crecimiento de la OMS (hasta los 19 años), cargá la fecha de nacimiento del paciente.',
    sex: 'Las curvas de crecimiento de la OMS son distintas para niñas y niños: con el sexo «no informado» no se pueden mostrar.',
    missingSex:
        'Para ver las curvas de crecimiento de la OMS, cargá el sexo del paciente: son distintas para niñas y niños.',
} as const;

// Why a minor's value has no curve past the ages the WHO publishes it for.
const PAST_THE_CURVES: Partial<Record<GrowthIndicator, string>> = {
    'weight-for-age':
        'La OMS publica curvas de peso para la edad solo hasta los 10 años; después, el IMC para la edad sigue el crecimiento.',
    'head-circumference-for-age':
        'La OMS publica curvas de perímetro cefálico solo hasta los 5 años.',
};

// The median solid, P15 and P85 dashed, P3 and P97 dotted: told apart
// without color, the legend draws the same strokes.
export const CENTILE_STROKES: Record<CentileKey, string | undefined> = {
    p3: '2 3',
    p15: '6 4',
    p50: undefined,
    p85: '6 4',
    p97: '2 3',
};

export type GrowthPoint = {
    measuredAt: string;
    ageMonths: number;
    age: string;
    value: number;
    percentile: number | null;
};

export type GrowthRow = Partial<Record<CentileKey, number>> & {
    ageMonths: number;
    value?: number;
};

export type GrowthChart =
    | {
          status: 'curves';
          sex: GrowthSex;
          rows: GrowthRow[];
          points: GrowthPoint[];
          domain: [number, number];
      }
    | { status: 'unavailable'; reason: string }
    | { status: 'none' };

/**
 * The WHO curves for one value's series (oldest first), or why there are
 * none. Each measurement is placed at the age it was taken: one past the
 * curves keeps its point without a percentile.
 */
export function growthChartOf(
    series: { measuredAt: string; value: number }[],
    field: VitalSignField,
    patient: GrowthPatient,
): GrowthChart {
    const indicator = GROWTH_INDICATORS[field];

    if (indicator === undefined || series.length === 0) {
        return { status: 'none' };
    }

    const birthDate = patient.birth_date;

    if (birthDate === null) {
        return { status: 'unavailable', reason: GROWTH_UNAVAILABLE.birthDate };
    }

    const ages = series.map(({ measuredAt }) =>
        ageInDaysOn(birthDate, fromInstant(measuredAt)),
    );
    const onCurve = (age: number) => age >= 0 && age <= lastAgeOf(indicator);

    if (!ages.some(onCurve)) {
        const minor = ages.some((age) => age >= 0 && age <= LAST_CURVE_AGE);
        const reason = PAST_THE_CURVES[indicator];

        return minor && reason !== undefined
            ? { status: 'unavailable', reason }
            : { status: 'none' };
    }

    if (patient.sex === null) {
        return { status: 'unavailable', reason: GROWTH_UNAVAILABLE.missingSex };
    }

    if (patient.sex === 'u') {
        return { status: 'unavailable', reason: GROWTH_UNAVAILABLE.sex };
    }

    const sex: GrowthSex = patient.sex === 'f' ? 'female' : 'male';
    const points = series.map(({ measuredAt, value }, index) => ({
        measuredAt,
        ageMonths: ages[index] / DAYS_PER_MONTH,
        age: formatAgeOn(birthDate, fromInstant(measuredAt)),
        value,
        percentile: percentileOf(indicator, sex, ages[index], value),
    }));
    const domain = domainOf(points.map(({ ageMonths }) => ageMonths));
    const curveAges = tableAgesOf(indicator).filter(
        (age) =>
            age >= domain[0] * DAYS_PER_MONTH &&
            age <= domain[1] * DAYS_PER_MONTH,
    );
    const rows: GrowthRow[] = [
        ...[domain[0], domain[1]].map((months) => months * DAYS_PER_MONTH),
        ...curveAges,
    ].map((age) => ({
        ageMonths: age / DAYS_PER_MONTH,
        ...centilesAt(indicator, sex, age),
    }));

    points.forEach((point, index) => {
        rows.push({
            ageMonths: point.ageMonths,
            ...centilesAt(indicator, sex, ages[index]),
            value: point.value,
        });
    });
    rows.sort((a, b) => a.ageMonths - b.ageMonths);

    return { status: 'curves', sex, rows, points, domain };
}

/**
 * The measurement nearest the hovered age, within 3% of the axis: the
 * curves' rows lie between the measurements, so the pointer rarely lands on
 * a measurement's own row.
 */
export function measurementNear(
    chart: Extract<GrowthChart, { status: 'curves' }>,
    ageMonths: number,
): GrowthPoint | undefined {
    const reach = (chart.domain[1] - chart.domain[0]) * 0.03;
    let nearest: GrowthPoint | undefined;

    for (const point of chart.points) {
        const distance = Math.abs(point.ageMonths - ageMonths);

        if (
            distance <= reach &&
            (nearest === undefined ||
                distance < Math.abs(nearest.ageMonths - ageMonths))
        ) {
            nearest = point;
        }
    }

    return nearest;
}

// The measured ages with some room at both ends, at least a month wide.
function domainOf(ages: number[]): [number, number] {
    const first = Math.min(...ages);
    const last = Math.max(...ages);
    const room = Math.max(1, (last - first) * 0.05);

    return [Math.max(0, first - room), last + room];
}

/**
 * Ticks of the age axis: months up to two years, years after, and months
 * again when the measurements fall between two birthdays (no two whole
 * years to mark).
 */
export function ageAxisOf(domain: [number, number]): {
    label: string;
    ticks: number[];
    format: (months: number) => string;
} {
    const inYears = domain[1] > 24 && ticksOf(domain, 12).length >= 2;
    const unit = inYears ? 12 : 1;

    return {
        label: inYears ? 'Edad (años)' : 'Edad (meses)',
        ticks: ticksOf(domain, unit),
        format: (months) => String(Math.round(months / unit)),
    };
}

// At most eight ticks, on whole multiples of a round number of `unit`s.
function ticksOf([from, to]: [number, number], unit: number): number[] {
    const step =
        [1, 2, 3, 6, 12].find(
            (candidate) => (to - from) / (candidate * unit) <= 8,
        ) ?? 12;
    const ticks: number[] = [];

    for (
        let tick = Math.ceil(from / (step * unit)) * step * unit;
        tick <= to;
        tick += step * unit
    ) {
        ticks.push(tick);
    }

    return ticks;
}
