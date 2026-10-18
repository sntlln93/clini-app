import type { RefObject } from 'react';

import { ReasonDialog } from '@/features/reason-dialog/ReasonDialog';
import type { Appointment } from '@/types/appointment';
import type { ClinicalNote } from '@/types/clinical-note';
import { useAnnulClinicalNote } from '../-hooks/use-clinical-notes';

type AnnulClinicalNoteDialogProps = {
    appointment: Appointment | null;
    note: ClinicalNote | null;
    onClose: () => void;
    onAnnulled: (note: ClinicalNote) => void;
    finalFocus: RefObject<HTMLElement | null>;
};

// Opened by state, not by its trigger: an annulled note loses its actions, so
// a trigger inside them would unmount the dialog before it closes (#323).
export function AnnulClinicalNoteDialog({
    appointment,
    note,
    onClose,
    onAnnulled,
    finalFocus,
}: AnnulClinicalNoteDialogProps) {
    const annul = useAnnulClinicalNote(appointment);

    return (
        <ReasonDialog
            open={note !== null}
            onOpenChange={(next) => !next && onClose()}
            finalFocus={finalFocus}
            title="Anular nota"
            description="La nota queda en la historia clínica, marcada como anulada junto con el motivo. No se puede deshacer."
            submitLabel="Anular nota"
            onSubmit={async (reason) => {
                if (note === null) {
                    return;
                }
                await annul.mutateAsync({ id: note.id, reason });
                onAnnulled(note);
            }}
        />
    );
}
