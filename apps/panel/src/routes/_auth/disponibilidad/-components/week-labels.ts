/** Indexed by `day_of_week` (0 = Sunday). */
export const DAY_NAMES = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
];

export const DAY_SHORT_NAMES = [
    'Dom',
    'Lun',
    'Mar',
    'Mié',
    'Jue',
    'Vie',
    'Sáb',
];

/** Monday-first display order; `day_of_week` itself stays 0 = Sunday. */
export const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function rangeCountLabel(count: number): string {
    if (count === 0) {
        return 'Sin atención';
    }

    return count === 1 ? '1 franja' : `${count} franjas`;
}

/** What copying a day's ranges to others does. */
export function copyDaysDescription(from: number): string {
    return `Las franjas de los días que elijas se reemplazan por las del ${DAY_NAMES[from].toLowerCase()}.`;
}
