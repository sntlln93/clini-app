import { Button } from '@/components/ui/button';
import type { Appointment } from '@/types/appointment';
import type { Professional } from '@/types/professional';
import { Plus } from 'lucide-react';
import { addDays } from './agenda-dates';
import { AppointmentCard } from './AppointmentCard';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const dayNameFormatter = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
});

function isSameDay(iso: string, date: Date): boolean {
    const time = new Date(iso);
    return (
        time.getFullYear() === date.getFullYear() &&
        time.getMonth() === date.getMonth() &&
        time.getDate() === date.getDate()
    );
}

export type AgendaWeekViewProps = {
    weekStart: Date;
    professionals: Professional[];
    appointments: Appointment[];
    canUpdate: (membership: Professional) => boolean;
    canCreate: (membership: Professional) => boolean;
    onDayClick?: (day: Date) => void;
};

export function AgendaWeekView({
    weekStart,
    professionals,
    appointments,
    canUpdate,
    canCreate,
    onDayClick,
}: AgendaWeekViewProps) {
    const days = Array.from({ length: 7 }, (_, index) =>
        addDays(weekStart, index),
    );
    // A day has no professional of its own, so quick-create needs just one creatable visible professional.
    const canCreateAny = professionals.some(canCreate);
    const membershipById = new Map(
        professionals.map((professional) => [professional.id, professional]),
    );

    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
            {days.map((day, index) => {
                const dayAppointments = appointments
                    .filter((appointment) =>
                        isSameDay(appointment.start_at, day),
                    )
                    .sort((a, b) => a.start_at.localeCompare(b.start_at));

                return (
                    <div
                        key={day.toISOString()}
                        className="min-w-0 space-y-2 rounded-lg border p-2"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">
                                {DAY_LABELS[index]} {day.getDate()}
                            </div>
                            {canCreateAny && (
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={`Nuevo turno el ${dayNameFormatter.format(day)}`}
                                    onClick={() => onDayClick?.(day)}
                                >
                                    <Plus />
                                </Button>
                            )}
                        </div>

                        <div className="space-y-1">
                            {dayAppointments.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Sin turnos
                                </p>
                            )}

                            {dayAppointments.map((appointment) => {
                                const professional = membershipById.get(
                                    appointment.membership_id,
                                );

                                return (
                                    <AppointmentCard
                                        key={appointment.id}
                                        appointment={appointment}
                                        canUpdate={
                                            professional
                                                ? canUpdate(professional)
                                                : false
                                        }
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
