import { useState } from 'react';

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
import { PrescriptionList } from './PrescriptionList';

type PrescriptionsDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: Appointment | null;
};

// Contextual dialog (ADR 0006): lists the medication the acting membership
// indicated in this appointment and resolves record/amend inline (#319, #323).
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

    const [amending, setAmending] = useState<Prescription | null>(null);

    // Adjust state during render (not a useEffect, per react-hooks/set-state-in-effect): clears the pending amendment as soon as the dialog re-opens.
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setAmending(null);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90svh] overflow-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Medicación indicada</DialogTitle>
                    <DialogDescription>
                        Solo vos ves la medicación que indicaste en este turno.
                        Queda registrada en la ficha del paciente y no se borra:
                        si la corregís, la versión anterior queda en el
                        historial.
                    </DialogDescription>
                </DialogHeader>

                {fetchErrorMessage && (
                    <p className="text-sm text-destructive">
                        {fetchErrorMessage}
                    </p>
                )}

                <PrescriptionList
                    prescriptions={prescriptions}
                    isLoading={isLoading}
                    restricted={restricted}
                    onAmend={setAmending}
                />

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
                        amending={amending}
                        onCancelAmendment={() => setAmending(null)}
                        onSaved={() => setAmending(null)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
