import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    displayPatientName,
    formatAppointmentTime,
    type WaitingQueue,
} from './waiting-room';

type ProfessionalQueueCardProps = {
    queue: WaitingQueue;
};

export function ProfessionalQueueCard({ queue }: ProfessionalQueueCardProps) {
    const { professional, waiting } = queue;
    const [next, ...rest] = waiting;
    const headingId = `sala-de-espera-profesional-${professional.id}`;

    return (
        <Card aria-labelledby={headingId} role="region" className="min-w-0">
            <CardHeader>
                <CardTitle
                    id={headingId}
                    className="text-2xl font-semibold wrap-break-word"
                >
                    {professional.user.name}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {next ? (
                    <div className="rounded-lg bg-primary/10 p-4">
                        <p className="text-base font-medium text-muted-foreground">
                            Próximo paciente
                        </p>
                        <p className="text-4xl font-bold wrap-break-word text-foreground">
                            {displayPatientName(next.patient_name)}
                        </p>
                        <p className="text-lg text-muted-foreground">
                            Turno {formatAppointmentTime(next.start_at)}
                        </p>
                    </div>
                ) : (
                    <p className="text-2xl text-muted-foreground">
                        Nadie en espera
                    </p>
                )}

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
                                    <span className="text-lg text-muted-foreground">
                                        Turno{' '}
                                        {formatAppointmentTime(
                                            appointment.start_at,
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
