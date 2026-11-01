import {
    type DateTime,
    fromCalendarDate,
    fromDateAndTime,
    fromInstant,
    toCalendarDate,
    toTimeInputValue,
} from '@/lib/datetime';
import type { AvailabilityException } from '@/types/availability';
import { z } from 'zod';
import { isAllDayRange } from './exception-format';

export const exceptionFormSchema = z
    .object({
        type: z.enum(['blocked', 'extra']),
        startDate: z.string(),
        endDate: z.string(),
        allDay: z.boolean(),
        startTime: z.string(),
        endTime: z.string(),
        reason: z.string().max(255, 'El motivo admite hasta 255 caracteres.'),
        isOrgWide: z.boolean(),
    })
    .superRefine((values, ctx) => {
        let valid = true;
        const issue = (path: keyof ExceptionFormValues, message: string) => {
            valid = false;
            ctx.addIssue({ code: 'custom', path: [path], message });
        };

        if (values.startDate === '') {
            issue('startDate', 'Ingresá la fecha.');
        }
        if (values.type === 'blocked' && values.endDate === '') {
            issue('endDate', 'Ingresá la fecha de fin.');
        }
        if (usesTimes(values)) {
            if (values.startTime === '') {
                issue('startTime', 'Ingresá la hora de inicio.');
            }
            if (values.endTime === '') {
                issue('endTime', 'Ingresá la hora de fin.');
            }
        }
        if (!valid) {
            return;
        }

        if (values.type === 'blocked' && values.endDate < values.startDate) {
            issue(
                'endDate',
                'La fecha de fin no puede ser anterior a la de inicio.',
            );
            return;
        }

        const range = exceptionRange(values);
        if (range && range.end <= range.start) {
            issue(
                'endTime',
                values.type === 'extra'
                    ? 'La hora de fin tiene que ser posterior a la de inicio.'
                    : 'El fin tiene que ser posterior al inicio.',
            );
        }
    });

export type ExceptionFormValues = z.infer<typeof exceptionFormSchema>;

/** Whether the form asks for hours: always for extra hours, for a blocked range unless it is all day. */
export function usesTimes(values: ExceptionFormValues): boolean {
    return values.type === 'extra' || !values.allDay;
}

/** Whether the exception covers the whole practice: only a blocked one can (the API rejects an org-wide extra). */
export function isOrgWideBlock(values: ExceptionFormValues): boolean {
    return values.type === 'blocked' && values.isOrgWide;
}

const DEFAULT_TIMES = { startTime: '09:00', endTime: '13:00' };

export function exceptionFormDefaults(
    exception?: AvailabilityException,
): ExceptionFormValues {
    if (!exception) {
        return {
            type: 'blocked',
            startDate: '',
            endDate: '',
            allDay: true,
            ...DEFAULT_TIMES,
            reason: '',
            isOrgWide: false,
        };
    }

    const start = fromInstant(exception.start_at);
    const end = fromInstant(exception.end_at);
    const allDay = exception.type === 'blocked' && isAllDayRange(start, end);

    return {
        type: exception.type,
        startDate: toCalendarDate(start),
        endDate: toCalendarDate(allDay ? end.minus({ days: 1 }) : end),
        allDay,
        ...(allDay
            ? DEFAULT_TIMES
            : {
                  startTime: toTimeInputValue(start),
                  endTime: toTimeInputValue(end),
              }),
        reason: exception.reason ?? '',
        isOrgWide: exception.membership_id === null,
    };
}

/**
 * The instants the form describes, in the practice's zone, or `null` while a
 * field is missing. All day runs from the first day's midnight to the
 * midnight after the last; extra hours are one range on a single date.
 */
export function exceptionRange(
    values: ExceptionFormValues,
): { start: DateTime; end: DateTime } | null {
    const endDate = values.type === 'extra' ? values.startDate : values.endDate;
    if (values.startDate === '' || endDate === '') {
        return null;
    }

    try {
        if (!usesTimes(values)) {
            return {
                start: fromCalendarDate(values.startDate),
                end: fromCalendarDate(endDate).plus({ days: 1 }),
            };
        }
        if (values.startTime === '' || values.endTime === '') {
            return null;
        }

        return {
            start: fromDateAndTime(values.startDate, values.startTime),
            end: fromDateAndTime(endDate, values.endTime),
        };
    } catch {
        // A half-typed date or time; the inputs only hand over valid ones.
        return null;
    }
}
