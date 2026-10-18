import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { fromInstant } from '@/lib/datetime';
import type { Prescription } from '@/types/prescription';

function formatDate(iso: string): string {
    return fromInstant(iso).toLocaleString({ dateStyle: 'short' });
}

// Read-only list of the medication the acting membership indicated to this
// patient (#319), in full since nothing else shows it; it's recorded and
// edited from the appointment in the agenda.
export function PatientPrescriptionsCard({
    prescriptions,
}: {
    prescriptions: Prescription[];
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Medicación indicada</CardTitle>
                <CardDescription>
                    Solo ves la medicación que indicaste vos.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {prescriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Todavía no registraste medicación para este paciente.
                    </p>
                ) : (
                    prescriptions.map((prescription) => (
                        <div
                            key={prescription.id}
                            className="space-y-2 rounded-lg border p-3 text-sm"
                        >
                            <ul className="space-y-2">
                                {prescription.items.map((item) => (
                                    <li
                                        key={item.id}
                                        className="wrap-break-word"
                                    >
                                        <p className="font-medium">
                                            {item.medication}
                                            {item.presentation &&
                                                ` — ${item.presentation}`}
                                        </p>
                                        <p className="text-muted-foreground">
                                            {item.dosage} · Cantidad:{' '}
                                            {item.quantity}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-xs text-muted-foreground tabular-nums">
                                {formatDate(prescription.issued_at)}
                            </p>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
