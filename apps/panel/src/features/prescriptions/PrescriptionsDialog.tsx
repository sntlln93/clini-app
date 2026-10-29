import { useRef, useState } from 'react';

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
import { AnnulPrescriptionDialog } from './AnnulPrescriptionDialog';
import { PrescriptionForm } from './PrescriptionForm';
import { PrescriptionList } from './PrescriptionList';
import { usePrescriptions } from './use-prescriptions';

type PrescriptionsDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // Only its id is read, so the patient page passes its own appointment of
    // today without the agenda's whole `Appointment`.
    appointment: Pick<Appointment, 'id'> | null;
    // After each record, amendment or annulment, for a page that shows the
    // medication outside the dialog (the patient page, #325).
    onSaved?: () => void;
    // Opens straight on amending this record: the patient page's «Enmendar».
    amendOnOpen?: Prescription | null;
    // False keeps it to amending: the patient page records new medication
    // only on today's own appointment, not on the one an amendment opens on.
    allowCreate?: boolean;
};

// Contextual dialog (ADR 0006): lists the medication the acting membership
// indicated in this appointment and resolves record/amend/annul inline (#319,
// #323, #344), from the agenda and from the patient page.
export function PrescriptionsDialog({
    open,
    onOpenChange,
    appointment,
    onSaved,
    amendOnOpen = null,
    allowCreate = true,
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

    const [amending, setAmending] = useState<Prescription | null>(amendOnOpen);
    const [annulling, setAnnulling] = useState<Prescription | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Adjust state during render (not a useEffect, per react-hooks/set-state-in-effect): clears the pending amendment as soon as the dialog re-opens.
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setAmending(amendOnOpen);
            setAnnulling(null);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90svh] overflow-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Medicación indicada</DialogTitle>
                    <DialogDescription>
                        La medicación que indicás en este turno queda en la
                        historia clínica del paciente, que leen los
                        profesionales que lo atienden, y no se borra: si la
                        corregís, la versión anterior queda en el historial.
                    </DialogDescription>
                </DialogHeader>

                {fetchErrorMessage && (
                    <p className="text-sm text-destructive">
                        {fetchErrorMessage}
                    </p>
                )}

                <div ref={listRef} tabIndex={-1}>
                    <PrescriptionList
                        prescriptions={prescriptions}
                        isLoading={isLoading}
                        restricted={restricted}
                        onAmend={setAmending}
                        onAnnul={setAnnulling}
                    />
                </div>

                {!includedInPlan && (
                    <PlanFeatureNote>
                        Registrar la medicación indicada es parte del plan
                        Consultorio. La que ya registraste sigue disponible para
                        consultar.
                    </PlanFeatureNote>
                )}

                {!restricted && (allowCreate || amending !== null) && (
                    <PrescriptionForm
                        appointmentId={appointmentId}
                        open={open}
                        amending={amending}
                        onCancelAmendment={() => setAmending(null)}
                        onSaved={() => {
                            setAmending(null);
                            onSaved?.();
                        }}
                    />
                )}
                <AnnulPrescriptionDialog
                    prescription={annulling}
                    onClose={() => setAnnulling(null)}
                    // Annulled medication can't be amended: leave amend mode.
                    onAnnulled={(annulled) => {
                        setAmending((current) =>
                            current?.id === annulled.id ? null : current,
                        );
                        onSaved?.();
                    }}
                    finalFocus={listRef}
                />
            </DialogContent>
        </Dialog>
    );
}
