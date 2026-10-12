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
