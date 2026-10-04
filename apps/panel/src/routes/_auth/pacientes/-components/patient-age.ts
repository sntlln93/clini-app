/** Whole years since `birthDate` (`YYYY-MM-DD`), read as a local date so no timezone shift moves the birthday. */
export function ageInYears(
    birthDate: string,
    today: Date = new Date(),
): number {
    const [year, month, day] = birthDate.split('-').map(Number);
    let age = today.getFullYear() - year;
    const birthdayPending =
        today.getMonth() + 1 < month ||
        (today.getMonth() + 1 === month && today.getDate() < day);

    if (birthdayPending) {
        age -= 1;
    }

    return age;
}

export function formatAge(age: number): string {
    return age === 1 ? '1 año' : `${age} años`;
}

/** "dd/mm/aaaa (NN años)", or "—" when unknown. */
export function formatBirthDateWithAge(
    birthDate: string | null,
    today: Date = new Date(),
): string {
    if (birthDate === null) {
        return '—';
    }

    const formatted = new Date(`${birthDate}T00:00:00`).toLocaleDateString(
        'es-AR',
        { day: '2-digit', month: '2-digit', year: 'numeric' },
    );

    return `${formatted} (${formatAge(ageInYears(birthDate, today))})`;
}
