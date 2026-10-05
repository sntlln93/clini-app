import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { AppointmentStatusChip } from '@/features/appointment-status/AppointmentStatusChip';
import { OnlineOriginMark } from '@/features/appointment-status/OnlineOriginMark';
import type { PatientAppointmentHistoryItem } from '@/types/patient';
import { Link } from '@tanstack/react-router';
import { agendaDaySearch } from './agenda-day-search';

type PatientAppointmentHistoryCardProps = {
    appointments: PatientAppointmentHistoryItem[];
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
                                            <Link
                                                to="/agenda"
                                                search={agendaDaySearch(
                                                    appointment.start_at,
                                                )}
                                                className="underline-offset-4 hover:underline"
                                            >
                                                <span className="tabular-nums">
                                                    {formatDateTime(
                                                        appointment.start_at,
                                                    )}
                                                </span>
                                            </Link>
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
                                            <span className="inline-flex items-center gap-1.5">
                                                <AppointmentStatusChip
                                                    status={appointment.status}
                                                />
                                                {appointment.origin ===
                                                    'online' && (
                                                    <OnlineOriginMark />
                                                )}
                                            </span>
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
