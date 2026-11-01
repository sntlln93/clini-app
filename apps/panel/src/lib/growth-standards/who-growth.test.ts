import { describe, expect, it } from 'vitest';
import {
    CENTILES,
    centilesAt,
    formatPercentile,
    lastAgeOf,
    percentileOf,
    type GrowthIndicator,
    type GrowthSex,
} from './who-growth';

// P3, P15, P50, P85 and P97 as the WHO publishes them, copied from its own
// percentile tables (data/README.md): the 2006 standards by day of age,
// the 2007 reference by month (age in days = month × 30.4375).
const PUBLISHED: [GrowthIndicator, GrowthSex, number, number[]][] = [
    ['weight-for-age', 'male', 0, [2.507, 2.865, 3.346, 3.878, 4.35]],
    ['weight-for-age', 'male', 3, [2.523, 2.879, 3.363, 3.901, 4.382]],
    ['weight-for-age', 'male', 10, [2.717, 3.088, 3.594, 4.158, 4.663]],
    ['weight-for-age', 'male', 45, [3.932, 4.403, 5.04, 5.748, 6.381]],
    ['weight-for-age', 'male', 100, [5.262, 5.819, 6.57, 7.399, 8.138]],
    ['weight-for-age', 'male', 365, [7.844, 8.61, 9.646, 10.798, 11.83]],
    ['weight-for-age', 'male', 500, [8.614, 9.461, 10.613, 11.899, 13.057]],
    ['weight-for-age', 'male', 730, [9.802, 10.793, 12.148, 13.677, 15.065]],
    ['weight-for-age', 'male', 731, [9.807, 10.798, 12.155, 13.684, 15.074]],
    ['weight-for-age', 'male', 1000, [11.043, 12.203, 13.806, 15.632, 17.308]],
    ['weight-for-age', 'male', 1500, [13.053, 14.514, 16.562, 18.938, 21.158]],
    ['weight-for-age', 'male', 1856, [14.398, 16.092, 18.497, 21.325, 24.002]],
    [
        'weight-for-age',
        'male',
        1856.6875,
        [14.58, 16.204, 18.506, 21.212, 23.774],
    ],
    [
        'weight-for-age',
        'male',
        2739.375,
        [18.841, 20.978, 24.137, 28.065, 32.017],
    ],
    [
        'weight-for-age',
        'male',
        3652.5,
        [23.581, 26.551, 31.159, 37.283, 43.938],
    ],
    ['weight-for-age', 'female', 0, [2.44, 2.779, 3.232, 3.729, 4.166]],
    ['weight-for-age', 'female', 3, [2.424, 2.766, 3.232, 3.749, 4.212]],
    ['weight-for-age', 'female', 10, [2.587, 2.944, 3.431, 3.977, 4.467]],
    ['weight-for-age', 'female', 45, [3.623, 4.066, 4.674, 5.359, 5.98]],
    ['weight-for-age', 'female', 100, [4.754, 5.287, 6.023, 6.858, 7.62]],
    ['weight-for-age', 'female', 365, [7.14, 7.891, 8.946, 10.176, 11.331]],
    ['weight-for-age', 'female', 500, [7.908, 8.734, 9.902, 11.273, 12.568]],
    ['weight-for-age', 'female', 730, [9.159, 10.115, 11.474, 13.079, 14.607]],
    ['weight-for-age', 'female', 731, [9.164, 10.121, 11.481, 13.087, 14.616]],
    [
        'weight-for-age',
        'female',
        1000,
        [10.524, 11.649, 13.256, 15.168, 17.003],
    ],
    ['weight-for-age', 'female', 1500, [12.669, 14.15, 16.302, 18.915, 21.475]],
    [
        'weight-for-age',
        'female',
        1856,
        [14.079, 15.823, 18.389, 21.552, 24.697],
    ],
    [
        'weight-for-age',
        'female',
        1856.6875,
        [14.173, 15.821, 18.258, 21.288, 24.336],
    ],
    [
        'weight-for-age',
        'female',
        2739.375,
        [17.927, 20.192, 23.637, 28.086, 32.752],
    ],
    [
        'weight-for-age',
        'female',
        3652.5,
        [23.676, 26.877, 31.858, 38.493, 45.7],
    ],
    [
        'length-height-for-age',
        'male',
        0,
        [46.324, 47.922, 49.884, 51.846, 53.445],
    ],
    [
        'length-height-for-age',
        'male',
        3,
        [46.843, 48.445, 50.412, 52.378, 53.981],
    ],
    [
        'length-height-for-age',
        'male',
        10,
        [48.056, 49.666, 51.643, 53.619, 55.23],
    ],
    [
        'length-height-for-age',
        'male',
        45,
        [52.892, 54.559, 56.606, 58.652, 60.319],
    ],
    [
        'length-height-for-age',
        'male',
        100,
        [58.316, 60.052, 62.183, 64.313, 66.049],
    ],
    [
        'length-height-for-age',
        'male',
        365,
        [71.27, 73.277, 75.739, 78.202, 80.208],
    ],
    [
        'length-height-for-age',
        'male',
        500,
        [75.752, 77.954, 80.658, 83.361, 85.564],
    ],
    [
        'length-height-for-age',
        'male',
        730,
        [82.057, 84.636, 87.802, 90.968, 93.547],
    ],
    [
        'length-height-for-age',
        'male',
        731,
        [81.382, 83.962, 87.13, 90.298, 92.879],
    ],
    [
        'length-height-for-age',
        'male',
        1000,
        [87.285, 90.286, 93.971, 97.655, 100.657],
    ],
    [
        'length-height-for-age',
        'male',
        1500,
        [96.068, 99.649, 104.046, 108.443, 112.024],
    ],
    [
        'length-height-for-age',
        'male',
        1856,
        [101.714, 105.657, 110.497, 115.337, 119.279],
    ],
    [
        'length-height-for-age',
        'male',
        1856.6875,
        [101.629, 105.506, 110.265, 115.023, 118.9],
    ],
    [
        'length-height-for-age',
        'male',
        3043.75,
        [118.197, 123.068, 129.047, 135.025, 139.896],
    ],
    [
        'length-height-for-age',
        'male',
        4565.625,
        [138.786, 144.917, 152.442, 159.968, 166.099],
    ],
    [
        'length-height-for-age',
        'male',
        6939.75,
        [162.817, 168.979, 176.543, 184.107, 190.27],
    ],
    [
        'length-height-for-age',
        'female',
        0,
        [45.644, 47.217, 49.148, 51.078, 52.651],
    ],
    [
        'length-height-for-age',
        'female',
        3,
        [46.134, 47.714, 49.654, 51.594, 53.175],
    ],
    [
        'length-height-for-age',
        'female',
        10,
        [47.278, 48.875, 50.837, 52.798, 54.395],
    ],
    [
        'length-height-for-age',
        'female',
        45,
        [51.649, 53.334, 55.402, 57.47, 59.155],
    ],
    [
        'length-height-for-age',
        'female',
        100,
        [56.503, 58.296, 60.496, 62.696, 64.488],
    ],
    [
        'length-height-for-age',
        'female',
        365,
        [69.163, 71.336, 74.005, 76.673, 78.847],
    ],
    [
        'length-height-for-age',
        'female',
        500,
        [73.764, 76.144, 79.064, 81.985, 84.364],
    ],
    [
        'length-height-for-age',
        'female',
        730,
        [80.335, 83.058, 86.401, 89.744, 92.467],
    ],
    [
        'length-height-for-age',
        'female',
        731,
        [79.661, 82.385, 85.73, 89.074, 91.799],
    ],
    [
        'length-height-for-age',
        'female',
        1000,
        [85.924, 89.019, 92.818, 96.617, 99.712],
    ],
    [
        'length-height-for-age',
        'female',
        1500,
        [95.29, 98.969, 103.484, 108, 111.678],
    ],
    [
        'length-height-for-age',
        'female',
        1856,
        [100.924, 104.97, 109.935, 114.901, 118.946],
    ],
    [
        'length-height-for-age',
        'female',
        1856.6875,
        [100.624, 104.655, 109.602, 114.549, 118.579],
    ],
    [
        'length-height-for-age',
        'female',
        3043.75,
        [117.407, 122.392, 128.511, 134.63, 139.615],
    ],
    [
        'length-height-for-age',
        'female',
        4565.625,
        [141.019, 146.849, 154.004, 161.16, 166.989],
    ],
    [
        'length-height-for-age',
        'female',
        6939.75,
        [150.853, 156.376, 163.155, 169.934, 175.457],
    ],
    ['bmi-for-age', 'male', 0, [11.254, 12.16, 13.407, 14.826, 16.13]],
    ['bmi-for-age', 'male', 3, [11.144, 12.1, 13.379, 14.786, 16.035]],
    ['bmi-for-age', 'male', 10, [11.136, 12.155, 13.469, 14.853, 16.033]],
    ['bmi-for-age', 'male', 45, [13.306, 14.362, 15.749, 17.244, 18.546]],
    ['bmi-for-age', 'male', 100, [14.497, 15.567, 16.992, 18.55, 19.926]],
    ['bmi-for-age', 'male', 365, [14.515, 15.482, 16.799, 18.28, 19.626]],
    ['bmi-for-age', 'male', 500, [14.116, 15.034, 16.29, 17.712, 19.015]],
    ['bmi-for-age', 'male', 730, [13.685, 14.547, 15.736, 17.093, 18.347]],
    ['bmi-for-age', 'male', 731, [13.924, 14.806, 16.019, 17.401, 18.676]],
    ['bmi-for-age', 'male', 1000, [13.588, 14.484, 15.698, 17.055, 18.281]],
    ['bmi-for-age', 'male', 1500, [13.164, 14.073, 15.313, 16.71, 17.982]],
    ['bmi-for-age', 'male', 1856, [13, 13.909, 15.184, 16.675, 18.088]],
    ['bmi-for-age', 'male', 1856.6875, [13.148, 14.03, 15.264, 16.7, 18.052]],
    ['bmi-for-age', 'male', 3043.75, [13.482, 14.421, 15.834, 17.659, 19.605]],
    ['bmi-for-age', 'male', 4565.625, [14.831, 16.007, 17.87, 20.486, 23.61]],
    ['bmi-for-age', 'male', 6939.75, [17.779, 19.539, 22.188, 25.584, 29.14]],
    ['bmi-for-age', 'female', 0, [11.213, 12.118, 13.336, 14.686, 15.892]],
    ['bmi-for-age', 'female', 3, [11.059, 12.019, 13.283, 14.646, 15.834]],
    ['bmi-for-age', 'female', 10, [10.95, 11.987, 13.314, 14.698, 15.868]],
    ['bmi-for-age', 'female', 45, [12.721, 13.818, 15.259, 16.81, 18.158]],
    ['bmi-for-age', 'female', 100, [13.836, 14.963, 16.467, 18.117, 19.577]],
    ['bmi-for-age', 'female', 365, [13.93, 14.955, 16.358, 17.947, 19.402]],
    ['bmi-for-age', 'female', 500, [13.552, 14.523, 15.861, 17.389, 18.799]],
    ['bmi-for-age', 'female', 730, [13.214, 14.132, 15.405, 16.873, 18.241]],
    ['bmi-for-age', 'female', 731, [13.473, 14.402, 15.688, 17.163, 18.533]],
    ['bmi-for-age', 'female', 1000, [13.275, 14.192, 15.46, 16.916, 18.268]],
    ['bmi-for-age', 'female', 1500, [12.924, 13.896, 15.255, 16.834, 18.319]],
    ['bmi-for-age', 'female', 1856, [12.818, 13.84, 15.28, 16.97, 18.574]],
    [
        'bmi-for-age',
        'female',
        1856.6875,
        [12.874, 13.846, 15.244, 16.936, 18.598],
    ],
    [
        'bmi-for-age',
        'female',
        3043.75,
        [13.095, 14.162, 15.806, 18.004, 20.449],
    ],
    [
        'bmi-for-age',
        'female',
        4565.625,
        [14.836, 16.216, 18.399, 21.432, 24.978],
    ],
    ['bmi-for-age', 'female', 6939.75, [16.734, 18.593, 21.427, 25.113, 29.03]],
    [
        'head-circumference-for-age',
        'male',
        0,
        [32.073, 33.145, 34.462, 35.778, 36.851],
    ],
    [
        'head-circumference-for-age',
        'male',
        3,
        [32.412, 33.467, 34.763, 36.058, 37.113],
    ],
    [
        'head-circumference-for-age',
        'male',
        10,
        [33.21, 34.222, 35.464, 36.706, 37.718],
    ],
    [
        'head-circumference-for-age',
        'male',
        45,
        [36.046, 37.034, 38.246, 39.458, 40.446],
    ],
    [
        'head-circumference-for-age',
        'male',
        100,
        [38.626, 39.627, 40.856, 42.084, 43.085],
    ],
    [
        'head-circumference-for-age',
        'male',
        365,
        [43.647, 44.732, 46.064, 47.395, 48.48],
    ],
    [
        'head-circumference-for-age',
        'male',
        500,
        [44.614, 45.726, 47.091, 48.455, 49.567],
    ],
    [
        'head-circumference-for-age',
        'male',
        730,
        [45.689, 46.839, 48.249, 49.66, 50.809],
    ],
    [
        'head-circumference-for-age',
        'male',
        731,
        [45.693, 46.843, 48.254, 49.664, 50.814],
    ],
    [
        'head-circumference-for-age',
        'male',
        1000,
        [46.557, 47.745, 49.203, 50.66, 51.848],
    ],
    [
        'head-circumference-for-age',
        'male',
        1500,
        [47.518, 48.756, 50.276, 51.795, 53.033],
    ],
    [
        'head-circumference-for-age',
        'male',
        1856,
        [47.96, 49.224, 50.775, 52.327, 53.59],
    ],
    [
        'head-circumference-for-age',
        'female',
        0,
        [31.651, 32.651, 33.879, 35.106, 36.106],
    ],
    [
        'head-circumference-for-age',
        'female',
        3,
        [31.955, 32.948, 34.168, 35.387, 36.381],
    ],
    [
        'head-circumference-for-age',
        'female',
        10,
        [32.666, 33.643, 34.842, 36.041, 37.018],
    ],
    [
        'head-circumference-for-age',
        'female',
        45,
        [35.197, 36.204, 37.441, 38.678, 39.685],
    ],
    [
        'head-circumference-for-age',
        'female',
        100,
        [37.503, 38.558, 39.852, 41.147, 42.201],
    ],
    [
        'head-circumference-for-age',
        'female',
        365,
        [42.338, 43.486, 44.894, 46.302, 47.45],
    ],
    [
        'head-circumference-for-age',
        'female',
        500,
        [43.36, 44.523, 45.95, 47.377, 48.54],
    ],
    [
        'head-circumference-for-age',
        'female',
        730,
        [44.555, 45.733, 47.18, 48.626, 49.805],
    ],
    [
        'head-circumference-for-age',
        'female',
        731,
        [44.56, 45.738, 47.185, 48.631, 49.809],
    ],
    [
        'head-circumference-for-age',
        'female',
        1000,
        [45.576, 46.766, 48.227, 49.688, 50.878],
    ],
    [
        'head-circumference-for-age',
        'female',
        1500,
        [46.732, 47.931, 49.403, 50.875, 52.074],
    ],
    [
        'head-circumference-for-age',
        'female',
        1856,
        [47.289, 48.49, 49.965, 51.44, 52.642],
    ],
];

// Ages kept as rows of the table, where the curve is the WHO's own to the
// published 3 decimals; between them it is interpolated (README.md).
const TABLE_AGES = new Set([0, 3, 10, 365, 730, 731, 1856]);

describe('WHO growth curves', () => {
    it.each(PUBLISHED)(
        '%s, %s, day %f: the drawn centiles are the published ones',
        (indicator, sex, ageDays, published) => {
            const centiles = centilesAt(indicator, sex, ageDays);
            const tolerance =
                TABLE_AGES.has(ageDays) || !Number.isInteger(ageDays)
                    ? 0.0006
                    : published[2] * 0.004;

            expect(centiles).not.toBeNull();
            CENTILES.forEach(({ key }, index) => {
                expect(
                    Math.abs(centiles![key] - published[index]),
                ).toBeLessThanOrEqual(tolerance);
            });
        },
    );

    it.each(PUBLISHED)(
        '%s, %s, day %f: a measurement on a published centile reads as it',
        (indicator, sex, ageDays, published) => {
            CENTILES.forEach(({ percentile }, index) => {
                const read = percentileOf(
                    indicator,
                    sex,
                    ageDays,
                    published[index],
                );

                expect(Math.abs(read! - percentile)).toBeLessThan(0.5);
            });
        },
    );

    it('has no curve outside the ages the WHO publishes', () => {
        expect(lastAgeOf('weight-for-age')).toBe(120 * 30.4375);
        expect(lastAgeOf('length-height-for-age')).toBe(228 * 30.4375);
        expect(lastAgeOf('bmi-for-age')).toBe(228 * 30.4375);
        expect(lastAgeOf('head-circumference-for-age')).toBe(1856);

        expect(centilesAt('weight-for-age', 'male', 3653)).toBeNull();
        expect(
            centilesAt('head-circumference-for-age', 'female', 1857),
        ).toBeNull();
        expect(percentileOf('bmi-for-age', 'male', -1, 15)).toBeNull();
        expect(percentileOf('bmi-for-age', 'male', 6940, 20)).toBeNull();
    });

    it('steps from length to height at two years, as the standards do', () => {
        // Lying down a child measures 0.7 cm more than standing up.
        const length = centilesAt('length-height-for-age', 'male', 730)!;
        const height = centilesAt('length-height-for-age', 'male', 731)!;

        expect(length.p50).toBeCloseTo(87.8018, 4);
        expect(height.p50).toBeCloseTo(87.1303, 4);
    });

    it('writes the percentile as a whole number, open at both ends', () => {
        expect(formatPercentile(42.4)).toBe('P42');
        expect(formatPercentile(1)).toBe('P1');
        expect(formatPercentile(99)).toBe('P99');
        expect(formatPercentile(0.6)).toBe('< P1');
        expect(formatPercentile(99.4)).toBe('> P99');
    });
});
