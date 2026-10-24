import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { PrescriptionEntry } from '@/features/clinical-history/PrescriptionEntry';
import { PrescriptionItemList } from '@/features/clinical-history/PrescriptionItemList';
import { PrescriptionsDialog } from '@/features/prescriptions/PrescriptionsDialog';
import { patientPrescriptionsQueryKey } from '@/hooks/use-patient';
import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { fromInstant } from '@/lib/datetime';
import {
    usePlanIncludes,
    useWritesRestriction,
    type WritesRestriction,
} from '@/lib/plan';
import type { Prescription } from '@/types/prescription';
import { useState } from 'react';

function formatDate(iso: string): string {
    return fromInstant(iso).toLocaleString({ dateStyle: 'short' });
}

const READ_ONLY_REASONS: Record<WritesRestriction | 'feature', string> = {
    subscription:
        'Tu suscripción no está activa: la medicación indicada es de solo lectura.',
    plan: 'El plan Gratis incluye un solo profesional activo: la medicación indicada es de solo lectura hasta que pases a Consultorio o desactives profesionales.',
    feature:
        'Registrar la medicación indicada es parte del plan Consultorio: la que ya registraste sigue disponible para consultar.',
};

type PatientPrescriptionsCardProps = {
    patientId: number;
    prescriptions: Prescription[];
    // The acting membership's own appointment for today, or null: a record
    // belongs to an appointment, as a note does (#217).
    todaysAppointmentId: number | null;
};

// The medication the acting membership indicated to this patient (#319), in
// full since nothing else shows it, with every earlier version (#323). It is
// recorded on today's own appointment and amended on its own, both in the
// agenda's dialog; while the plan or the subscription leaves it read-only the
// card says why and offers neither. Every record listed is the acting
// membership's (CU-53).
export function PatientPrescriptionsCard({
    patientId,
    prescriptions,
    todaysAppointmentId,
}: PatientPrescriptionsCardProps) {
    // The appointment the dialog works on, and the record it amends, if any.
    // Kept after it closes, so the list stays put while the popup fades out.
    const [dialog, setDialog] = useState<{
        appointmentId: number;
        amending: Prescription | null;
    } | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const refreshPageData = useRefreshPageData();
    const restriction = useWritesRestriction();
    const includedInPlan = usePlanIncludes('prescriptions');
    const readOnlyReason =
        restriction ?? (includedInPlan ? null : ('feature' as const));
    const canWrite = readOnlyReason === null;
    const openDialog = (
        appointmentId: number,
        amending: Prescription | null,
    ) => {
        setDialog({ appointmentId, amending });
        setDialogOpen(true);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Medicación indicada</CardTitle>
                <CardDescription>
                    Solo ves la medicación que indicaste vos.
                    {readOnlyReason !== null
                        ? ` ${READ_ONLY_REASONS[readOnlyReason]}`
                        : todaysAppointmentId === null &&
                          ' Podés registrarla cuando tengas un turno con este paciente hoy.'}
                </CardDescription>
                {canWrite && todaysAppointmentId !== null && (
                    <CardAction>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                                openDialog(todaysAppointmentId, null)
                            }
                        >
                            Registrar medicación
                        </Button>
                    </CardAction>
                )}
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
                            actions={
                                canWrite && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                            openDialog(
                                                prescription.appointment_id,
                                                prescription,
                                            )
                                        }
                                    >
                                        Enmendar
                                    </Button>
                                )
                            }
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
            <PrescriptionsDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                appointment={dialog && { id: dialog.appointmentId }}
                amendOnOpen={dialog?.amending ?? null}
                // A new record only on today's own appointment (CU-53).
                allowCreate={
                    dialog !== null &&
                    dialog.appointmentId === todaysAppointmentId
                }
                onSaved={() =>
                    refreshPageData(patientPrescriptionsQueryKey(patientId))
                }
            />
        </Card>
    );
}
