import { formatShortDateTime } from '@/lib/datetime';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PlanFeatureNote } from '@/features/plan-feature-note/PlanFeatureNote';
import { extractFormErrors } from '@/lib/form-errors';
import { usePlanIncludes, useWritesRestricted } from '@/lib/plan';
import type { Appointment } from '@/types/appointment';
import type { Prescription } from '@/types/prescription';
import { usePrescriptions } from '../-hooks/use-prescriptions';
import { PrescriptionForm } from './PrescriptionForm';

type PrescriptionsDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: Appointment | null;
};

// Contextual dialog (ADR 0006): lists the medication the acting membership
// indicated in this appointment and resolves create/edit inline (#319).
export function PrescriptionsDialog({
    open,
    onOpenChange,
    appointment,
}: PrescriptionsDialogProps) {
    const appointmentId = appointment?.id ?? null;
    const query = usePrescriptions(appointmentId, open);
    const { data: prescriptions, isLoading } = query;
    // Read-only while writes are restricted (#28) or the plan leaves
    // prescriptions out (#237); the listing stays available.
    const includedInPlan = usePlanIncludes('prescriptions');
    const restricted = useWritesRestricted() || !includedInPlan;
    const fetchErrorMessage = query.isError
        ? extractFormErrors(query.error).message
        : null;

    const [editing, setEditing] = useState<Prescription | null>(null);

    // Adjust state during render (not a useEffect, per react-hooks/set-state-in-effect): clears the pending edit as soon as the dialog re-opens.
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setEditing(null);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90svh] overflow-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Medicación indicada</DialogTitle>
                    <DialogDescription>
                        Solo vos ves la medicación que indicaste en este turno.
                        Queda registrada en la ficha del paciente.
                    </DialogDescription>
                </DialogHeader>

                {fetchErrorMessage && (
                    <p className="text-sm text-destructive">
                        {fetchErrorMessage}
                    </p>
                )}

                <div className="space-y-3">
                    {isLoading && (
                        <p className="text-sm text-muted-foreground">
                            Cargando medicación…
                        </p>
                    )}
                    {!isLoading && prescriptions?.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Todavía no registraste medicación en este turno.
                        </p>
                    )}
                    {prescriptions?.map((prescription) => (
                        <div
                            key={prescription.id}
                            className="rounded-lg border p-3 text-sm"
                        >
                            <ul className="list-inside list-disc">
                                {prescription.items.map((item) => (
                                    <li
                                        key={item.id}
                                        className="wrap-break-word"
                                    >
                                        {item.medication} × {item.quantity}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground tabular-nums">
                                    {formatShortDateTime(
                                        prescription.issued_at,
                                    )}
                                </span>
                                {!restricted && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditing(prescription)}
                                    >
                                        Editar
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {!includedInPlan && (
                    <PlanFeatureNote>
                        Registrar la medicación indicada es parte del plan
                        Consultorio. La que ya registraste sigue disponible para
                        consultar.
                    </PlanFeatureNote>
                )}

                {!restricted && (
                    <PrescriptionForm
                        appointmentId={appointmentId}
                        open={open}
                        editing={editing}
                        onCancelEdit={() => setEditing(null)}
                        onSaved={() => setEditing(null)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
