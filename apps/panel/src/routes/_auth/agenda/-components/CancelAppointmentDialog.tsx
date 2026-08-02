import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Badge } from '@/components/ui/badge';
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
import { extractFormErrors } from '@/lib/form-errors';
import type { Appointment } from '@/types/appointment';
import { useCancelAppointment } from '../-hooks/use-appointments';
import { cancelSchema, type CancelFormValues } from './appointment-schemas';

type CancelAppointmentDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: Appointment | null;
};

const EMPTY_VALUES: CancelFormValues = { cancellation_reason: '' };

const QUICK_REASONS = [
    'El paciente canceló',
    'El paciente no puede asistir en ese horario',
    'Cambio de disponibilidad del profesional',
    'Motivo administrativo',
];

/**
 * Dedicated cancellation dialog with an optional reason and quick-pick
 * responses, submitted to `PATCH /appointments/{id}/cancel`.
 */
export function CancelAppointmentDialog({
    open,
    onOpenChange,
    appointment,
}: CancelAppointmentDialogProps) {
    const form = useForm<CancelFormValues>({
        resolver: zodResolver(cancelSchema),
        defaultValues: EMPTY_VALUES,
    });

    // `form.reset()` notifies Controller-subscribed children synchronously,
    // so clearing a discarded reason has to happen in an effect rather than
    // during render.
    useEffect(() => {
        if (open) {
            form.reset(EMPTY_VALUES);
        }
    }, [open, form]);

    const { mutateAsync, isPending } = useCancelAppointment();

    async function onSubmit(values: CancelFormValues) {
        if (!appointment) {
            return;
        }

        const trimmed = values.cancellation_reason.trim();

        try {
            await mutateAsync({
                appointmentId: appointment.id,
                cancellationReason: trimmed === '' ? null : trimmed,
            });
            onOpenChange(false);
        } catch (error) {
            const { message } = extractFormErrors(error);

            if (message) {
                form.setError('root', { message });
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cancelar turno</DialogTitle>
                    <DialogDescription>
                        Esta acción no se puede deshacer. Podés indicar un
                        motivo de cancelación, es opcional.
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

                        <div className="flex flex-wrap gap-2">
                            {QUICK_REASONS.map((reason) => (
                                <Badge
                                    key={reason}
                                    variant="outline"
                                    render={<button type="button" />}
                                    onClick={() =>
                                        form.setValue(
                                            'cancellation_reason',
                                            reason,
                                            { shouldValidate: true },
                                        )
                                    }
                                >
                                    {reason}
                                </Badge>
                            ))}
                        </div>

                        <FormField
                            control={form.control}
                            name="cancellation_reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Motivo (opcional)</FormLabel>
                                    <FormControl
                                        render={
                                            <Input maxLength={255} {...field} />
                                        }
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Volver
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={
                                    isPending || form.formState.isSubmitting
                                }
                            >
                                {isPending ? 'Cancelando…' : 'Cancelar turno'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
