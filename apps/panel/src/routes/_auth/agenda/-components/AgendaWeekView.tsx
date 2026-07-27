import type { Appointment } from '@/types/appointment';
import type { Membership } from '@/types/membership';
import { AppointmentCard } from './AppointmentCard';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

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
    professionals: Membership[];
    appointments: Appointment[];
    canUpdate: (membership: Membership) => boolean;
};

export function AgendaWeekView({
    weekStart,
    professionals,
    appointments,
    canUpdate,
}: AgendaWeekViewProps) {
    const days = Array.from({ length: 7 }, (_, index) =>
        addDays(weekStart, index),
    );
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
                        <div className="text-sm font-medium">
                            {DAY_LABELS[index]} {day.getDate()}
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
