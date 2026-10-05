import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { OrganizationUsage } from '@/types/organization';

export function OrganizationUsageCard({ usage }: { usage: OrganizationUsage }) {
    const rows: Array<[string, string]> = [
        ['Pacientes', formatNumber(usage.patients)],
        ['Profesionales activos', formatNumber(usage.professionals)],
        ['Turnos totales', formatNumber(usage.appointments_total)],
        [
            'Turnos creados (30 días)',
            formatNumber(usage.appointments_last_30_days),
        ],
        ['Turnos próximos', formatNumber(usage.appointments_upcoming)],
        [
            'Último turno creado',
            formatDateTime(usage.last_appointment_created_at),
        ],
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Uso</CardTitle>
            </CardHeader>
            <CardContent>
                <dl className="divide-y">
                    {rows.map(([label, value]) => (
                        <div
                            key={label}
                            className="flex items-center justify-between gap-4 py-2"
                        >
                            <dt className="text-muted-foreground">{label}</dt>
                            <dd className="font-medium tabular-nums">
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </CardContent>
        </Card>
    );
}
