import { setPracticeTimeZone, toInstant } from '@/lib/datetime';
import type { AvailabilityException } from '@/types/availability';
import { describe, expect, it } from 'vitest';
import {
    exceptionFormDefaults,
    exceptionFormSchema,
    exceptionRange,
    type ExceptionFormValues,
} from '../-components/exception-form';
import { exceptionSummary } from '../-components/exception-summary';

function values(overrides: Partial<ExceptionFormValues>): ExceptionFormValues {
    return { ...exceptionFormDefaults(), ...overrides };
}

function instants(form: ExceptionFormValues) {
    const range = exceptionRange(form);
    return range && [toInstant(range.start), toInstant(range.end)];
}

function stored(start_at: string, end_at: string): AvailabilityException {
    return {
        id: 1,
        membership_id: 3,
        type: 'blocked',
        start_at,
        end_at,
        reason: null,
    };
}

describe('all-day exceptions', () => {
    for (const [zone, offset] of [
        ['America/Argentina/Buenos_Aires', 'T03:00:00.000Z'],
        ['Etc/UTC', 'T00:00:00.000Z'],
    ] as const) {
        it(`run from the first midnight to the one after the last day, in ${zone}`, () => {
            setPracticeTimeZone(zone);
            const form = values({
                startDate: '2027-01-04',
                endDate: '2027-01-15',
            });

            expect(instants(form)).toEqual([
                `2027-01-04${offset}`,
                `2027-01-16${offset}`,
            ]);
        });

        it(`read back as all day with the same dates, in ${zone}`, () => {
            setPracticeTimeZone(zone);

            expect(
                exceptionFormDefaults(
                    stored(`2027-01-04${offset}`, `2027-01-16${offset}`),
                ),
            ).toMatchObject({
                allDay: true,
                startDate: '2027-01-04',
                endDate: '2027-01-15',
            });
        });
    }

    it("reads a range that isn't at the practice's midnight as timed", () => {
        setPracticeTimeZone('Etc/UTC');

        expect(
            exceptionFormDefaults(
                stored('2027-01-04T03:00:00Z', '2027-01-05T03:00:00Z'),
            ),
        ).toMatchObject({
            allDay: false,
            startDate: '2027-01-04',
            startTime: '03:00',
            endDate: '2027-01-05',
            endTime: '03:00',
        });
    });
});

describe('exceptionRange', () => {
    it('takes a timed block from an hour on its first day to an hour on its last', () => {
        const form = values({
            startDate: '2027-01-04',
            endDate: '2027-01-06',
            allDay: false,
            startTime: '14:00',
            endTime: '12:00',
        });

        expect(instants(form)).toEqual([
            '2027-01-04T17:00:00.000Z',
            '2027-01-06T15:00:00.000Z',
        ]);
    });

    it('keeps extra hours on a single date, whatever «Hasta» held', () => {
        const form = values({
            type: 'extra',
            startDate: '2026-11-07',
            endDate: '2026-11-20',
            startTime: '09:00',
            endTime: '13:00',
        });

        expect(instants(form)).toEqual([
            '2026-11-07T12:00:00.000Z',
            '2026-11-07T16:00:00.000Z',
        ]);
    });

    it('is null while a date is missing', () => {
        expect(exceptionRange(values({ startDate: '2026-11-07' }))).toBeNull();
    });
});

describe('exceptionFormSchema', () => {
    function messages(form: ExceptionFormValues) {
        const result = exceptionFormSchema.safeParse(form);
        return result.success
            ? {}
            : Object.fromEntries(
                  result.error.issues.map((issue) => [
                      issue.path.join('.'),
                      issue.message,
                  ]),
              );
    }

    it('asks for the dates', () => {
        expect(messages(values({}))).toEqual({
            startDate: 'Ingresá la fecha.',
            endDate: 'Ingresá la fecha de fin.',
        });
    });

    it('rejects an end date before the start', () => {
        expect(
            messages(
                values({ startDate: '2026-11-10', endDate: '2026-11-09' }),
            ),
        ).toEqual({
            endDate: 'La fecha de fin no puede ser anterior a la de inicio.',
        });
    });

    it('rejects extra hours that end before they start', () => {
        expect(
            messages(
                values({
                    type: 'extra',
                    startDate: '2026-11-07',
                    startTime: '13:00',
                    endTime: '09:00',
                }),
            ),
        ).toEqual({
            endTime: 'La hora de fin tiene que ser posterior a la de inicio.',
        });
    });

    it('rejects a timed block that ends before it starts on the same day', () => {
        expect(
            messages(
                values({
                    startDate: '2026-11-07',
                    endDate: '2026-11-07',
                    allDay: false,
                    startTime: '13:00',
                    endTime: '13:00',
                }),
            ),
        ).toEqual({ endTime: 'El fin tiene que ser posterior al inicio.' });
    });

    it('accepts a complete all-day block', () => {
        expect(
            messages(
                values({ startDate: '2026-11-07', endDate: '2026-11-07' }),
            ),
        ).toEqual({});
    });
});

describe('exceptionSummary', () => {
    it('counts the days of an all-day block within one month', () => {
        expect(
            exceptionSummary(
                values({ startDate: '2027-01-04', endDate: '2027-01-15' }),
            ),
        ).toBe('No atiende del lun 4 al vie 15 de enero (12 días).');
    });

    it('names both months of an all-day block across months', () => {
        expect(
            exceptionSummary(
                values({ startDate: '2026-12-28', endDate: '2027-01-03' }),
            ),
        ).toBe(
            'No atiende del lun 28 de diciembre al dom 3 de enero (7 días).',
        );
    });

    it('says the practice closes for an org-wide single day', () => {
        expect(
            exceptionSummary(
                values({
                    startDate: '2026-11-23',
                    endDate: '2026-11-23',
                    isOrgWide: true,
                }),
            ),
        ).toBe('El consultorio no atiende el lun 23 de noviembre.');
    });

    it('gives the hours of a timed block', () => {
        expect(
            exceptionSummary(
                values({
                    startDate: '2026-11-23',
                    endDate: '2026-11-23',
                    allDay: false,
                    startTime: '14:00',
                    endTime: '18:00',
                }),
            ),
        ).toBe('No atiende el lun 23 de noviembre de 14:00 a 18:00.');
        expect(
            exceptionSummary(
                values({
                    startDate: '2027-01-04',
                    endDate: '2027-01-06',
                    allDay: false,
                    startTime: '14:00',
                    endTime: '12:00',
                }),
            ),
        ).toBe(
            'No atiende desde el lun 4 de enero a las 14:00 hasta el mié 6 de enero a las 12:00.',
        );
    });

    it('describes extra hours, never as org-wide', () => {
        expect(
            exceptionSummary(
                values({
                    type: 'extra',
                    startDate: '2026-11-07',
                    startTime: '09:00',
                    endTime: '13:00',
                    isOrgWide: true,
                }),
            ),
        ).toBe('Atiende además el sáb 7 de noviembre de 09:00 a 13:00.');
    });

    it('is null while the form is incomplete or backwards', () => {
        expect(exceptionSummary(values({}))).toBeNull();
        expect(
            exceptionSummary(
                values({
                    type: 'extra',
                    startDate: '2026-11-07',
                    startTime: '13:00',
                    endTime: '09:00',
                }),
            ),
        ).toBeNull();
    });
});
