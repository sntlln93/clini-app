import { buttonVariants } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { PatientAppointmentHistoryItem } from '@/types/patient';
import { Link } from '@tanstack/react-router';
import { CalendarDays } from 'lucide-react';
import { agendaDaySearch } from './agenda-day-search';

type PatientNextAppointmentCardProps = {
    appointment: PatientAppointmentHistoryItem | null;
};

function formatNextAppointment(iso: string): string {
    return new Date(iso).toLocaleString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

export function PatientNextAppointmentCard({
    appointment,
}: PatientNextAppointmentCardProps) {
    // With nothing upcoming, the agenda opens on today, where a new appointment would be booked.
    const search = agendaDaySearch(
        appointment?.start_at ?? new Date().toISOString(),
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Próximo turno</CardTitle>
                <CardAction>
                    <Link
                        to="/agenda"
                        search={search}
                        className={buttonVariants({
                            variant: 'outline',
                            size: 'sm',
                        })}
                    >
                        <CalendarDays data-icon="inline-start" aria-hidden />
                        Ver en agenda
                    </Link>
                </CardAction>
            </CardHeader>
            <CardContent>
                {appointment ? (
                    <div className="space-y-1 text-sm">
                        <p className="text-base font-medium first-letter:uppercase">
                            {formatNextAppointment(appointment.start_at)}
                        </p>
                        <p className="text-muted-foreground">
                            {[
                                appointment.service_name,
                                appointment.professional_name,
                            ]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                        </p>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Sin turnos próximos.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
