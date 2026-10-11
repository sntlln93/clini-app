import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { ProfessionalReport } from '@/types/report';
import { formatHours, formatPercent } from './report-format';

/** One row per professional for the whole period. */
export function ProfessionalsTable({
    professionals,
}: {
    professionals: ProfessionalReport[];
}) {
    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle>Por profesional</CardTitle>
                <CardDescription>
                    La ocupación cuenta solo el tiempo con turnos dentro del
                    horario publicado.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {professionals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No hay profesionales con actividad en el período.
                    </p>
                ) : (
                    <div className="overflow-auto rounded-md border">
                        <Table>
                            <caption className="sr-only">
                                Ocupación y ausentismo por profesional
                            </caption>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Profesional</TableHead>
                                    <TableHead className="text-right">
                                        Ocupación
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Horas con turnos / publicadas
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Ausentismo
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Ausentes / llegaron a su hora
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {professionals.map((professional) => (
                                    <TableRow key={professional.membership_id}>
                                        <TableCell className="font-medium">
                                            {professional.name ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {formatPercent(
                                                professional.occupancy_rate,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {formatHours(
                                                professional.booked_minutes,
                                            )}{' '}
                                            /{' '}
                                            {formatHours(
                                                professional.published_minutes,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {formatPercent(
                                                professional.no_show_rate,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {professional.no_show} /{' '}
                                            {professional.attended +
                                                professional.no_show}
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
