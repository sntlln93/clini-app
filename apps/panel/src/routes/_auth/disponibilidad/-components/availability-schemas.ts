import { z } from 'zod';

import type { AvailabilityExceptionType } from '@/types/availability';

export const TYPE_OPTIONS: {
    value: AvailabilityExceptionType;
    label: string;
}[] = [
    { value: 'blocked', label: 'Bloqueo' },
    { value: 'extra', label: 'Extra' },
];

export const availabilityExceptionSchema = z.object({
    type: z.enum(['blocked', 'extra']),
    startAt: z.string().min(1, 'La fecha de inicio es obligatoria.'),
    endAt: z.string().min(1, 'La fecha de fin es obligatoria.'),
    reason: z.string(),
    isOrgWide: z.boolean(),
});

export type AvailabilityExceptionFormValues = z.infer<
    typeof availabilityExceptionSchema
>;

export const availabilitySlotSchema = z
    .object({
        startTime: z.string().min(1, 'La hora de inicio es obligatoria.'),
        endTime: z.string().min(1, 'La hora de fin es obligatoria.'),
    })
    .refine((values) => values.endTime > values.startTime, {
        message: 'La hora de fin debe ser posterior a la de inicio.',
        path: ['endTime'],
    });

export type AvailabilitySlotFormValues = z.infer<typeof availabilitySlotSchema>;
