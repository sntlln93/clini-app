import { DateTime, fromCalendarDate } from '@/lib/datetime';

/**
 * Whole years since `birthDate` (`YYYY-MM-DD`) up to the practice's today.
 * Compared as calendar parts, not as a duration: a birth date whose midnight
 * a DST change skipped would otherwise fall short by an hour on the birthday,
 * and a 29 February birthday would count on the 28th.
 */
export function ageInYears(
    birthDate: string,
    today: DateTime = DateTime.now(),
): number {
    const birth = fromCalendarDate(birthDate);
    const birthdayPending =
        today.month < birth.month ||
        (today.month === birth.month && today.day < birth.day);

    return today.year - birth.year - (birthdayPending ? 1 : 0);
}

export function formatAge(age: number): string {
    return age === 1 ? '1 año' : `${age} años`;
}

// Both days as UTC calendar dates: a midnight DST skipped can't shorten a day.
function calendarSpan(
    birthDate: string,
    on: DateTime,
    units: ('years' | 'months' | 'days')[],
) {
    const birth = fromCalendarDate(birthDate);

    return DateTime.utc(on.year, on.month, on.day).diff(
        DateTime.utc(birth.year, birth.month, birth.day),
        units,
    );
}

/** Calendar days from `birthDate` to the practice's day of `on`. */
export function ageInDaysOn(birthDate: string, on: DateTime): number {
    return calendarSpan(birthDate, on, ['days']).days;
}

/** «15 días» in the first month, «9 meses» up to two years, «3 años y 4 meses» after. */
export function formatAgeOn(birthDate: string, on: DateTime): string {
    const { years, months, days } = calendarSpan(birthDate, on, [
        'years',
        'months',
        'days',
    ]);
    const allMonths = years * 12 + months;

    if (allMonths === 0) {
        return days === 1 ? '1 día' : `${days} días`;
    }

    if (allMonths < 24) {
        return formatMonths(allMonths);
    }

    return months === 0
        ? formatAge(years)
        : `${formatAge(years)} y ${formatMonths(months)}`;
}

function formatMonths(months: number): string {
    return months === 1 ? '1 mes' : `${months} meses`;
}

/** "dd/mm/aaaa (NN años)", or "—" when unknown. */
export function formatBirthDateWithAge(
    birthDate: string | null,
    today: DateTime = DateTime.now(),
): string {
    if (birthDate === null) {
        return '—';
    }

    const formatted = fromCalendarDate(birthDate).toFormat('dd/MM/yyyy');

    return `${formatted} (${formatAge(ageInYears(birthDate, today))})`;
}
