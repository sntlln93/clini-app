import {
    type DateTime,
    formatTime,
    formatWeekdayDay,
    formatWeekdayDayMonth,
    isSameDay,
} from '@/lib/datetime';
import {
    type ExceptionFormValues,
    exceptionRange,
    isOrgWideBlock,
    usesTimes,
} from './exception-form';
import { wholeDaysBetween } from './exception-format';

function hours(start: DateTime, end: DateTime): string {
    return `de ${formatTime(start)} a ${formatTime(end)}`;
}

/**
 * The sentence under the form that says what the exception does, e.g.
 * «No atiende del lun 4 al vie 15 de enero (12 días).» or «Atiende además el
 * sáb 7 de noviembre de 09:00 a 13:00.»; `null` while the form is incomplete.
 */
export function exceptionSummary(values: ExceptionFormValues): string | null {
    const range = exceptionRange(values);
    if (!range || range.end <= range.start) {
        return null;
    }
    const { start, end } = range;

    if (values.type === 'extra') {
        return `Atiende además el ${formatWeekdayDayMonth(start)} ${hours(start, end)}.`;
    }

    const subject = isOrgWideBlock(values)
        ? 'El consultorio no atiende'
        : 'No atiende';

    if (usesTimes(values)) {
        return isSameDay(start, end)
            ? `${subject} el ${formatWeekdayDayMonth(start)} ${hours(start, end)}.`
            : `${subject} desde el ${formatWeekdayDayMonth(start)} a las ${formatTime(start)} hasta el ${formatWeekdayDayMonth(end)} a las ${formatTime(end)}.`;
    }

    const days = wholeDaysBetween(start, end);
    if (days === 1) {
        return `${subject} el ${formatWeekdayDayMonth(start)}.`;
    }

    const last = end.minus({ days: 1 });
    const from = start.hasSame(last, 'month')
        ? formatWeekdayDay(start)
        : formatWeekdayDayMonth(start);

    return `${subject} del ${from} al ${formatWeekdayDayMonth(last)} (${days} días).`;
}
