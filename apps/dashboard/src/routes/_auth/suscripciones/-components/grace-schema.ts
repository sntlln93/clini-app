import { reportingDateOffset } from '@/lib/format';
import { z } from 'zod';

export const MAX_GRACE_EXTENSION_DAYS = 90;

/** The date input's bounds — tomorrow..today+90 in the reporting timezone, the same "today" the API validates against. */
export function graceDateBounds(now = new Date()) {
    return {
        min: reportingDateOffset(1, now),
        max: reportingDateOffset(MAX_GRACE_EXTENSION_DAYS, now),
    };
}

export function graceExtensionSchema(now = new Date()) {
    const { min, max } = graceDateBounds(now);

    return z.object({
        // `Y-m-d` strings compare correctly as plain strings.
        grace_ends_on: z
            .string()
            .min(1, 'Elegí la nueva fecha de fin.')
            .refine(
                (value) => value >= min,
                'Elegí una fecha a partir de mañana.',
            )
            .refine(
                (value) => value <= max,
                `La fecha no puede superar los ${MAX_GRACE_EXTENSION_DAYS} días desde hoy.`,
            ),
        note: z
            .string()
            .max(500, 'La nota no puede superar los 500 caracteres.'),
    });
}

export type GraceExtensionValues = z.infer<
    ReturnType<typeof graceExtensionSchema>
>;
