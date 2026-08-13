import { useState } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { extractFormErrors } from '@/lib/form-errors';
import type { Appointment } from '@/types/appointment';
import type { ClinicalNote } from '@/types/clinical-note';
import {
    useClinicalNotes,
    useDeleteClinicalNote,
} from '../-hooks/use-clinical-notes';
import { ClinicalNoteForm } from './ClinicalNoteForm';

type ClinicalNotesDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: Appointment | null;
};

function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString('es-AR', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

// Contextual dialog (ADR 0006): lists the acting membership's own notes for
// this appointment and resolves add/edit/delete inline, no dedicated page.
export function ClinicalNotesDialog({
    open,
    onOpenChange,
    appointment,
}: ClinicalNotesDialogProps) {
    const appointmentId = appointment?.id ?? null;
    const notesQuery = useClinicalNotes(appointmentId, open);
    const { data: notes, isLoading } = notesQuery;
    const remove = useDeleteClinicalNote(appointmentId);
    const fetchErrorMessage = notesQuery.isError
        ? extractFormErrors(notesQuery.error).message
        : null;

    const [editingNote, setEditingNote] = useState<ClinicalNote | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

    // Adjust state during render (not a useEffect, per react-hooks/set-state-in-effect): clears the pending edit as soon as the dialog re-opens.
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setEditingNote(null);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Notas clínicas</DialogTitle>
                    <DialogDescription>
                        Solo vos podés ver y editar tus notas de este turno.
                    </DialogDescription>
                </DialogHeader>

                {fetchErrorMessage && (
                    <p className="text-sm text-destructive">
                        {fetchErrorMessage}
                    </p>
                )}
                {remove.message && (
                    <p className="text-sm text-destructive">{remove.message}</p>
                )}

                <div className="max-h-64 space-y-3 overflow-auto">
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
                        <div
                            key={note.id}
                            className="rounded-lg border p-3 text-sm"
                        >
                            <p className="whitespace-pre-wrap">{note.body}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground">
                                    {formatTimestamp(note.updated_at)}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingNote(note)}
                                    >
                                        Editar
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                            setPendingDeleteId(note.id)
                                        }
                                    >
                                        Borrar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <ClinicalNoteForm
                    appointmentId={appointmentId}
                    open={open}
                    editingNote={editingNote}
                    onCancelEdit={() => setEditingNote(null)}
                    onSaved={() => setEditingNote(null)}
                />
            </DialogContent>

            <ConfirmDialog
                open={pendingDeleteId !== null}
                onOpenChange={(next) => !next && setPendingDeleteId(null)}
                title="Borrar nota"
                description="Esta acción no se puede deshacer."
                onConfirm={() => {
                    if (pendingDeleteId !== null) {
                        remove.mutate(pendingDeleteId);
                        setPendingDeleteId(null);
                    }
                }}
                isPending={remove.isPending}
            />
        </Dialog>
    );
}
