import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Appointment } from '@/types/appointment';
import { useState, type FormEvent } from 'react';
import { useRescheduleAppointment } from '../-hooks/use-appointments';

type RescheduleAppointmentDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: Appointment | null;
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
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [appliedId, setAppliedId] = useState<number | null>(null);

    const openId = open ? (appointment?.id ?? null) : null;

    // Adjust state during render instead of an Effect: reset the form every
    // time the dialog (re)opens for a given appointment.
    if (open && appointment && openId !== appliedId) {
        setAppliedId(openId);
        setDate(toDateInput(appointment.start_at));
        setTime(toTimeInput(appointment.start_at));
    }

    const { mutate, isPending, message, errors } = useRescheduleAppointment();

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!appointment || !date || !time) {
            return;
        }

        mutate(
            {
                appointmentId: appointment.id,
                startAt: `${date}T${time}`,
            },
            { onSuccess: () => onOpenChange(false) },
        );
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

                <form onSubmit={handleSubmit} className="space-y-4">
                    {message && (
                        <p className="text-sm text-destructive">{message}</p>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="reschedule-date">Fecha</Label>
                            <Input
                                id="reschedule-date"
                                type="date"
                                value={date}
                                onChange={(event) =>
                                    setDate(event.target.value)
                                }
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reschedule-time">Hora</Label>
                            <Input
                                id="reschedule-time"
                                type="time"
                                value={time}
                                onChange={(event) =>
                                    setTime(event.target.value)
                                }
                                required
                            />
                        </div>
                        {errors.start_at && (
                            <p className="text-sm text-destructive sm:col-span-2">
                                {errors.start_at}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Reprogramando…' : 'Reprogramar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
