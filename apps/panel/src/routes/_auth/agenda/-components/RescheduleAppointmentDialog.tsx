import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { ErrorCode } from '@/lib/error-codes';
import { extractFormErrors } from '@/lib/form-errors';
import type { Appointment } from '@/types/appointment';
import { useRescheduleAppointment } from '../-hooks/use-appointments';
import {
    rescheduleSchema,
    type RescheduleFormValues,
} from './appointment-schemas';

type RescheduleAppointmentDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: Appointment | null;
};

const EMPTY_VALUES: RescheduleFormValues = { date: '', time: '' };

// Only `slot_taken` has a field to land on here — `date`/`time` are the only
// inputs this dialog has. `not_reschedulable_from_status` has no matching
// field in this form, so it deliberately falls through to the general
// message instead: an unmapped code is never silently dropped.
const RESCHEDULE_FIELD_MAP: Partial<Record<ErrorCode, string>> = {
    'appointments.slot_taken': 'start_at',
};

function toDateInput(iso: string): string {
    return iso.slice(0, 10);
}

function toTimeInput(iso: string): string {
    return new Date(iso).toTimeString().slice(0, 5);
}

/**
 * Lets the user pick a new `start_at` for an existing appointment and
 * submits it to `POST /appointments/{id}/reschedule`; the backend creates a
 * new appointment row and marks the original as `rescheduled`.
 */
export function RescheduleAppointmentDialog({
    open,
    onOpenChange,
    appointment,
}: RescheduleAppointmentDialogProps) {
    const form = useForm<RescheduleFormValues>({
        resolver: zodResolver(rescheduleSchema),
        defaultValues: EMPTY_VALUES,
    });

    // `form.reset()` notifies Controller-subscribed children synchronously,
    // so prefilling from the appointment being rescheduled has to happen in
    // an effect rather than during render.
    useEffect(() => {
        if (open && appointment) {
            form.reset({
                date: toDateInput(appointment.start_at),
                time: toTimeInput(appointment.start_at),
            });
        }
    }, [open, appointment, form]);

    const { mutateAsync, isPending } = useRescheduleAppointment();

    async function onSubmit(values: RescheduleFormValues) {
        if (!appointment) {
            return;
        }

        try {
            await mutateAsync({
                appointmentId: appointment.id,
                startAt: `${values.date}T${values.time}`,
            });
            onOpenChange(false);
        } catch (error) {
            const { message, errors } = extractFormErrors(
                error,
                RESCHEDULE_FIELD_MAP,
            );

            if (errors.start_at) {
                form.setError('time', { message: errors.start_at });
            }
            if (message) {
                form.setError('root', { message });
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reprogramar turno</DialogTitle>
                    <DialogDescription>
                        Elegí el nuevo horario para este turno.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        {form.formState.errors.root && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.root.message}
                            </p>
                        )}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha</FormLabel>
                                        <FormControl
                                            render={
                                                <Input type="date" {...field} />
                                            }
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="time"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hora</FormLabel>
                                        <FormControl
                                            render={
                                                <Input type="time" {...field} />
                                            }
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    isPending || form.formState.isSubmitting
                                }
                            >
                                {isPending ? 'Reprogramando…' : 'Reprogramar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
