import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type {
    PatientAppointmentHistoryItem,
    PatientAppointmentStatus,
} from '@/types/patient';

type PatientAppointmentHistoryCardProps = {
    appointments: PatientAppointmentHistoryItem[];
};

// Mirrors `AppointmentStatus` labels used in the agenda (AppointmentCard.tsx) — keep in sync.
const STATUS_LABELS: Record<PatientAppointmentStatus, string> = {
    scheduled: 'Agendado',
    confirmed: 'Confirmado',
    arrived: 'Llegó',
    completed: 'Completado',
    no_show: 'Ausente',
    cancelled: 'Cancelado',
    rescheduled: 'Reprogramado',
};

const STATUS_VARIANTS: Record<
    PatientAppointmentStatus,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    scheduled: 'outline',
    confirmed: 'secondary',
    arrived: 'secondary',
    completed: 'default',
    no_show: 'destructive',
    cancelled: 'destructive',
    rescheduled: 'outline',
};

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('es-AR', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

export function PatientAppointmentHistoryCard({
    appointments,
}: PatientAppointmentHistoryCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de turnos</CardTitle>
            </CardHeader>
            <CardContent>
                {appointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Este paciente todavía no tiene turnos.
                    </p>
                ) : (
                    <div className="overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Servicio</TableHead>
                                    <TableHead>Profesional</TableHead>
                                    <TableHead>Organización</TableHead>
                                    <TableHead>Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {appointments.map((appointment) => (
                                    <TableRow key={appointment.id}>
                                        <TableCell>
                                            {formatDateTime(
                                                appointment.start_at,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {appointment.service_name ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            {appointment.professional_name ??
                                                '—'}
                                        </TableCell>
                                        <TableCell>
                                            {appointment.organization_name ??
                                                '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    STATUS_VARIANTS[
                                                        appointment.status
                                                    ]
                                                }
                                            >
                                                {
                                                    STATUS_LABELS[
                                                        appointment.status
                                                    ]
                                                }
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
