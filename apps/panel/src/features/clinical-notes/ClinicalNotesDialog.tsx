import { formatShortDateTime } from '@/lib/datetime';
import { useRef, useState, type RefObject } from 'react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ClinicalNoteEntry } from '@/features/clinical-history/ClinicalNoteEntry';
import { extractFormErrors } from '@/lib/form-errors';
import { useWritesRestricted } from '@/lib/plan';
import type { ClinicalNote } from '@/types/clinical-note';
import { AnnulClinicalNoteDialog } from './AnnulClinicalNoteDialog';
import { ClinicalNoteActions } from './ClinicalNoteActions';
import { ClinicalNoteForm } from './ClinicalNoteForm';
import { useClinicalNotes, type NoteAppointment } from './use-clinical-notes';

type ClinicalNotesDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: NoteAppointment | null;
    // Opens straight on amending this note: the patient page's «Enmendar».
    amendOnOpen?: ClinicalNote | null;
    // False keeps it to amending: the patient page writes a new note only on
    // today's own appointment, which isn't the one an amendment opens on.
    allowCreate?: boolean;
    // Where focus goes on close when what opened it may be gone by then (an
    // annul inside the dialog unmounts the patient page's «Enmendar»).
    finalFocus?: RefObject<HTMLElement | null>;
};

// Contextual dialog (ADR 0006): lists the acting membership's own notes for
// this appointment and resolves add/amend/annul inline, no dedicated page.
export function ClinicalNotesDialog({
    open,
    onOpenChange,
    appointment,
    amendOnOpen = null,
    allowCreate = true,
    finalFocus,
}: ClinicalNotesDialogProps) {
    const appointmentId = appointment?.id ?? null;
    const notesQuery = useClinicalNotes(appointmentId, open);
    const { data: notes, isLoading } = notesQuery;
    // Read-only while writes are restricted (#28, #237).
    const restricted = useWritesRestricted();
    const fetchErrorMessage = notesQuery.isError
        ? extractFormErrors(notesQuery.error).message
        : null;

    const [amendingNote, setAmendingNote] = useState<ClinicalNote | null>(
        amendOnOpen,
    );
    const [annullingNote, setAnnullingNote] = useState<ClinicalNote | null>(
        null,
    );
    const listRef = useRef<HTMLDivElement>(null);

    // Adjust state during render (not a useEffect, per react-hooks/set-state-in-effect): clears the pending amendment as soon as the dialog re-opens.
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setAmendingNote(amendOnOpen);
            setAnnullingNote(null);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md" finalFocus={finalFocus}>
                <DialogHeader>
                    <DialogTitle>Notas clínicas</DialogTitle>
                    <DialogDescription>
                        Tus notas de este turno quedan en la historia clínica
                        del paciente, que leen los profesionales que lo
                        atienden. Una nota no se edita ni se borra: si la
                        corregís, la versión anterior queda en el historial.
                    </DialogDescription>
                </DialogHeader>

                {fetchErrorMessage && (
                    <p className="text-sm text-destructive">
                        {fetchErrorMessage}
                    </p>
                )}

                <div
                    ref={listRef}
                    tabIndex={-1}
                    className="max-h-64 space-y-3 overflow-auto"
                >
                    {isLoading && (
                        <p className="text-sm text-muted-foreground">
                            Cargando notas…
                        </p>
                    )}
                    {!isLoading && notes?.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Todavía no cargaste notas para este turno.
                        </p>
                    )}
                    {notes?.map((note) => (
                        <ClinicalNoteEntry
                            key={note.id}
                            note={note}
                            meta={
                                <span className="tabular-nums">
                                    {formatShortDateTime(note.created_at)}
                                </span>
                            }
                            actions={
                                !restricted &&
                                note.annulment === null && (
                                    <ClinicalNoteActions
                                        onAmend={() => setAmendingNote(note)}
                                        onAnnul={() => setAnnullingNote(note)}
                                    />
                                )
                            }
                        />
                    ))}
                </div>

                {!restricted && (allowCreate || amendingNote !== null) && (
                    <ClinicalNoteForm
                        appointment={appointment}
                        open={open}
                        amendingNote={amendingNote}
                        onCancelAmendment={() => setAmendingNote(null)}
                        onSaved={() => setAmendingNote(null)}
                    />
                )}
                <AnnulClinicalNoteDialog
                    appointment={appointment}
                    note={annullingNote}
                    onClose={() => setAnnullingNote(null)}
                    // An annulled note can't be amended: leave amend mode.
                    onAnnulled={(annulled) =>
                        setAmendingNote((current) =>
                            current?.id === annulled.id ? null : current,
                        )
                    }
                    finalFocus={listRef}
                />
            </DialogContent>
        </Dialog>
    );
}
