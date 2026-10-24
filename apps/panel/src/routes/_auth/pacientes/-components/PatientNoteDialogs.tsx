import { AnnulClinicalNoteDialog } from '@/features/clinical-notes/AnnulClinicalNoteDialog';
import { ClinicalNotesDialog } from '@/features/clinical-notes/ClinicalNotesDialog';
import type { ClinicalNote } from '@/types/clinical-note';
import type { RefObject } from 'react';

type PatientNoteDialogsProps = {
    patientId: number;
    // Kept after it closes, so the list stays put while the popup fades out.
    amending: ClinicalNote | null;
    amendOpen: boolean;
    annulling: ClinicalNote | null;
    onClose: () => void;
    finalFocus: RefObject<HTMLElement | null>;
};

// The agenda's own dialogs, on the note's appointment: amending opens its
// notes dialog straight on that note, with no new note there (this page adds
// them on today's own appointment), annulling asks for the reason. Both
// refresh this page when they save (`useRefreshNotes` drops the patient).
export function PatientNoteDialogs({
    patientId,
    amending,
    amendOpen,
    annulling,
    onClose,
    finalFocus,
}: PatientNoteDialogsProps) {
    const appointmentOf = (note: ClinicalNote | null) =>
        note === null
            ? null
            : { id: note.appointment_id, patient_id: patientId };

    return (
        <>
            <ClinicalNotesDialog
                open={amendOpen}
                onOpenChange={(open) => !open && onClose()}
                appointment={appointmentOf(amending)}
                amendOnOpen={amending}
                allowCreate={false}
                finalFocus={finalFocus}
            />
            <AnnulClinicalNoteDialog
                appointment={appointmentOf(annulling)}
                note={annulling}
                onClose={onClose}
                onAnnulled={onClose}
                finalFocus={finalFocus}
            />
        </>
    );
}
