import { z } from 'zod';

// `superRefine` (not per-field `.refine()`) keeps each selection field's inferred type `number | null`, matching RHF's `Control`/`useWatch` shape.
export const appointmentSchema = z
    .object({
        membershipId: z.number().nullable(),
        serviceId: z.number().nullable(),
        patientId: z.number().nullable(),
        date: z.string(),
        time: z.string(),
        reason: z.string(),
    })
    .superRefine((values, ctx) => {
        if (values.membershipId === null) {
            ctx.addIssue({
                code: 'custom',
                message: 'Elegí un profesional.',
                path: ['membershipId'],
            });
        }
        if (values.serviceId === null) {
            ctx.addIssue({
                code: 'custom',
                message: 'Elegí un servicio.',
                path: ['serviceId'],
            });
        }
        if (values.patientId === null) {
            ctx.addIssue({
                code: 'custom',
                message: 'Elegí un paciente.',
                path: ['patientId'],
            });
        }
        if (!values.date) {
            ctx.addIssue({
                code: 'custom',
                message: 'La fecha es obligatoria.',
                path: ['date'],
            });
        }
        if (!values.time) {
            ctx.addIssue({
                code: 'custom',
                message: 'La hora es obligatoria.',
                path: ['time'],
            });
        }
    });

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;

export const rescheduleSchema = z.object({
    date: z.string().min(1, 'La fecha es obligatoria.'),
    time: z.string().min(1, 'La hora es obligatoria.'),
});

export type RescheduleFormValues = z.infer<typeof rescheduleSchema>;

export const cancelSchema = z.object({
    cancellation_reason: z
        .string()
        .max(255, 'El motivo no puede superar los 255 caracteres.'),
});

export type CancelFormValues = z.infer<typeof cancelSchema>;
