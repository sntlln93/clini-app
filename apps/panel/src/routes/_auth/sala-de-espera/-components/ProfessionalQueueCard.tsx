import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STATUS_TONES } from '@/lib/appointment-status';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';
import {
    displayPatientName,
    formatAppointmentTime,
    formatWaitingTime,
    minutesSinceArrival,
    type WaitingQueue,
} from './waiting-room';

type ProfessionalQueueCardProps = {
    queue: WaitingQueue;
    /** When the data was read: waiting times are relative to it, so they match the "Actualizado" clock. */
    now: number;
};

function WaitingTime({
    appointment,
    now,
    className,
}: {
    appointment: Appointment;
    now: number;
    className: string;
}) {
    const minutes = minutesSinceArrival(appointment.arrived_at, now);

    return minutes === null ? null : (
        <p className={className}>{formatWaitingTime(minutes)}</p>
    );
}

export function ProfessionalQueueCard({
    queue,
    now,
}: ProfessionalQueueCardProps) {
    const { professional, waiting } = queue;
    const [next, ...rest] = waiting;
    const headingId = `sala-de-espera-profesional-${professional.id}`;

    return (
        <Card aria-labelledby={headingId} role="region" className="min-w-0">
            <CardHeader>
                <CardTitle
                    id={headingId}
                    className="text-2xl font-medium wrap-break-word"
                >
                    {professional.user.name}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Everyone here has arrived: the box takes the `arrived` tone (#235). */}
                <div
                    className={cn(
                        next &&
                            cn(
                                'rounded-lg border-l-[3px] p-4',
                                STATUS_TONES.arrived.block,
                            ),
                    )}
                >
                    {/* Always mounted, so a change of next patient is announced; the waiting time stays outside it to avoid a re-announcement every minute. */}
                    <div aria-live="polite" aria-atomic="true">
                        {next ? (
                            <>
                                <p className="text-base font-medium text-muted-foreground">
                                    Próximo paciente
                                </p>
                                <p className="text-4xl font-medium tracking-tight wrap-break-word text-foreground">
                                    {displayPatientName(next.patient_name)}
                                </p>
                                <p className="text-lg text-muted-foreground tabular-nums">
                                    Turno {formatAppointmentTime(next.start_at)}
                                </p>
                            </>
                        ) : (
                            <p className="text-2xl text-muted-foreground">
                                Nadie en espera
                            </p>
                        )}
                    </div>
                    {next && (
                        <WaitingTime
                            appointment={next}
                            now={now}
                            className="text-lg text-muted-foreground tabular-nums"
                        />
                    )}
                </div>

                {rest.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-base font-medium text-muted-foreground">
                            En espera
                        </p>
                        <ol className="space-y-2">
                            {rest.map((appointment) => (
                                <li
                                    key={appointment.id}
                                    className="flex flex-wrap items-baseline justify-between gap-x-4 text-2xl"
                                >
                                    <span className="min-w-0 wrap-break-word">
                                        {displayPatientName(
                                            appointment.patient_name,
                                        )}
                                    </span>
                                    <div className="text-right text-lg text-muted-foreground tabular-nums">
                                        <p>
                                            Turno{' '}
                                            {formatAppointmentTime(
                                                appointment.start_at,
                                            )}
                                        </p>
                                        <WaitingTime
                                            appointment={appointment}
                                            now={now}
                                            className="text-base"
                                        />
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
