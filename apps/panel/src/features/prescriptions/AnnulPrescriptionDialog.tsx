import type { RefObject } from 'react';

import { ReasonDialog } from '@/features/reason-dialog/ReasonDialog';
import type { Prescription } from '@/types/prescription';
import { useAnnulPrescription } from './use-prescriptions';

type AnnulPrescriptionDialogProps = {
    prescription: Prescription | null;
    onClose: () => void;
    onAnnulled: (prescription: Prescription) => void;
    finalFocus: RefObject<HTMLElement | null>;
};

// Opened by state, not by its trigger: annulled medication loses its actions,
// so a trigger inside them would unmount the dialog before it closes (#344),
// as with a note (#323).
export function AnnulPrescriptionDialog({
    prescription,
    onClose,
    onAnnulled,
    finalFocus,
}: AnnulPrescriptionDialogProps) {
    const annul = useAnnulPrescription(prescription?.appointment_id ?? null);

    return (
        <ReasonDialog
            open={prescription !== null}
            onOpenChange={(next) => !next && onClose()}
            finalFocus={finalFocus}
            title="Anular medicación"
            description="La medicación queda en la historia clínica, marcada como anulada junto con el motivo. No se puede deshacer."
            submitLabel="Anular medicación"
            onSubmit={async (reason) => {
                if (prescription === null) {
                    return;
                }
                await annul.mutateAsync({ id: prescription.id, reason });
                onAnnulled(prescription);
            }}
        />
    );
}
