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
import type { Appointment } from '@/types/appointment';
import { useRescheduleSubmit } from '../-hooks/use-reschedule-submit';
import { toDateInputValue, toTimeInputValue } from './agenda-dates';
import { describeAppointment } from './appointment-format';
import {
    rescheduleSchema,
    type RescheduleFormValues,
} from './appointment-schemas';
import { AvailabilityWarningDialog } from './AvailabilityWarningDialog';

type RescheduleAppointmentDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: Appointment | null;
};

const EMPTY_VALUES: RescheduleFormValues = { date: '', time: '' };

// Submits to `POST /appointments/{id}/reschedule`; the backend creates a new row and marks the original as `rescheduled`.
export function RescheduleAppointmentDialog({
    open,
    onOpenChange,
    appointment,
}: RescheduleAppointmentDialogProps) {
    const form = useForm<RescheduleFormValues>({
        resolver: zodResolver(rescheduleSchema),
        defaultValues: EMPTY_VALUES,
    });

    // `form.reset()` notifies Controller children synchronously, so this must run in an effect, not during render.
    useEffect(() => {
        if (open && appointment) {
            // Both halves in local time — slicing the ISO string would take the UTC date, a day ahead for a late-evening appointment.
            const startAt = new Date(appointment.start_at);
            form.reset({
                date: toDateInputValue(startAt),
                time: toTimeInputValue(startAt),
            });
        }
    }, [open, appointment, form]);

    const {
        onValid,
        showWarning,
        setShowWarning,
        confirmWarning,
        isPending,
        isAvailabilityLoading,
    } = useRescheduleSubmit(form, appointment, open, () => onOpenChange(false));

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reprogramar turno</DialogTitle>
                        <DialogDescription>
                            {appointment &&
                                `${describeAppointment(appointment)}. `}
                            Elegí el nuevo horario.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onValid)}
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
                                                    <Input
                                                        type="date"
                                                        {...field}
                                                    />
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
                                                    <Input
                                                        type="time"
                                                        {...field}
                                                    />
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
                                        isPending ||
                                        form.formState.isSubmitting ||
                                        isAvailabilityLoading
                                    }
                                >
                                    {isPending
                                        ? 'Reprogramando…'
                                        : 'Reprogramar'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <AvailabilityWarningDialog
                open={showWarning}
                onOpenChange={setShowWarning}
                onConfirm={confirmWarning}
                confirmLabel="Reprogramar de todos modos"
            />
        </>
    );
}
