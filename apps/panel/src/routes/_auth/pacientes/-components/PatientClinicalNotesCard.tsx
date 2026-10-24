import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ClinicalNoteEntry } from '@/features/clinical-history/ClinicalNoteEntry';
import { formatShortDateTime } from '@/lib/datetime';
import { useWritesRestriction, type WritesRestriction } from '@/lib/plan';
import type { ClinicalNote } from '@/types/clinical-note';
import { useState } from 'react';
import { AddClinicalNoteForm } from './AddClinicalNoteForm';

type PatientClinicalNotesCardProps = {
    patientId: number;
    // Only rendered once the history is open to the acting membership: while
    // it isn't, `ClinicalHistoryAccessCard` takes its place (#325).
    notes: ClinicalNote[];
    // The acting membership's own appointment for today, or null when it
    // doesn't have one — drives whether "add note" is offered (issue #217).
    todaysAppointmentId: number | null;
};

const READ_ONLY_REASONS: Record<WritesRestriction, string> = {
    subscription:
        'Tu suscripción no está activa: las notas clínicas son de solo lectura.',
    plan: 'El plan Gratis incluye un solo profesional activo: las notas clínicas son de solo lectura hasta que pases a Consultorio o desactives profesionales.',
};

export function PatientClinicalNotesCard({
    patientId,
    notes,
    todaysAppointmentId,
}: PatientClinicalNotesCardProps) {
    const [showForm, setShowForm] = useState(false);
    // Clinical-note writes are read-only while writes are restricted (#28,
    // #237); the backend still enforces it.
    const restriction = useWritesRestriction();
    const canAddNote = todaysAppointmentId !== null && restriction === null;
    const unavailableReason = restriction
        ? READ_ONLY_REASONS[restriction]
        : todaysAppointmentId === null
          ? 'Podés agregar notas cuando tengas un turno con este paciente hoy.'
          : null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notas clínicas</CardTitle>
                {unavailableReason && (
                    <CardDescription>{unavailableReason}</CardDescription>
                )}
                {canAddNote && (
                    <CardAction>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowForm((prev) => !prev)}
                        >
                            {showForm ? 'Cancelar' : 'Agregar nota'}
                        </Button>
                    </CardAction>
                )}
            </CardHeader>
            <CardContent className="space-y-3">
                {canAddNote && todaysAppointmentId !== null && showForm && (
                    <AddClinicalNoteForm
                        patientId={patientId}
                        appointmentId={todaysAppointmentId}
                        onSaved={() => setShowForm(false)}
                    />
                )}
                {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Todavía no hay notas clínicas para este paciente.
                    </p>
                ) : (
                    notes.map((note) => (
                        <ClinicalNoteEntry
                            key={note.id}
                            note={note}
                            meta={
                                <>
                                    <span>{note.author_name ?? '—'}</span>
                                    <span className="tabular-nums">
                                        {formatShortDateTime(note.created_at)}
                                    </span>
                                </>
                            }
                        />
                    ))
                )}
            </CardContent>
        </Card>
    );
}
