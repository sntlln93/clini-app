import { formatShortDateTime } from '@/lib/datetime';
import { useRef, useState } from 'react';

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
import type { Appointment } from '@/types/appointment';
import type { ClinicalNote } from '@/types/clinical-note';
import { useClinicalNotes } from '../-hooks/use-clinical-notes';
import { AnnulClinicalNoteDialog } from './AnnulClinicalNoteDialog';
import { ClinicalNoteActions } from './ClinicalNoteActions';
import { ClinicalNoteForm } from './ClinicalNoteForm';

type ClinicalNotesDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: Appointment | null;
};

// Contextual dialog (ADR 0006): lists the acting membership's own notes for
// this appointment and resolves add/amend/annul inline, no dedicated page.
export function ClinicalNotesDialog({
    open,
    onOpenChange,
    appointment,
}: ClinicalNotesDialogProps) {
    const appointmentId = appointment?.id ?? null;
    const notesQuery = useClinicalNotes(appointmentId, open);
    const { data: notes, isLoading } = notesQuery;
    // Read-only while writes are restricted (#28, #237).
    const restricted = useWritesRestricted();
    const fetchErrorMessage = notesQuery.isError
        ? extractFormErrors(notesQuery.error).message
        : null;

    const [amendingNote, setAmendingNote] = useState<ClinicalNote | null>(null);
    const [annullingNote, setAnnullingNote] = useState<ClinicalNote | null>(
        null,
    );
    const listRef = useRef<HTMLDivElement>(null);

    // Adjust state during render (not a useEffect, per react-hooks/set-state-in-effect): clears the pending amendment as soon as the dialog re-opens.
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setAmendingNote(null);
            setAnnullingNote(null);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Notas clínicas</DialogTitle>
                    <DialogDescription>
                        Solo vos podés ver tus notas de este turno. Una nota no
                        se edita ni se borra: si la corregís, la versión
                        anterior queda en el historial.
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

                {!restricted && (
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
