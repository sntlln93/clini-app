import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { PrescriptionEntry } from '@/features/clinical-history/PrescriptionEntry';
import { PrescriptionItemList } from '@/features/clinical-history/PrescriptionItemList';
import { fromInstant } from '@/lib/datetime';
import type { Prescription } from '@/types/prescription';

function formatDate(iso: string): string {
    return fromInstant(iso).toLocaleString({ dateStyle: 'short' });
}

// Read-only list of the medication the acting membership indicated to this
// patient (#319), in full since nothing else shows it, with every earlier
// version (#323); it's recorded and amended from the appointment in the agenda.
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
                        <PrescriptionEntry
                            key={prescription.id}
                            prescription={prescription}
                            meta={
                                <span className="tabular-nums">
                                    {formatDate(prescription.issued_at)}
                                </span>
                            }
                        >
                            <PrescriptionItemList items={prescription.items} />
                        </PrescriptionEntry>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
