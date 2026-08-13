import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { ClinicalNote } from '@/types/clinical-note';
import { useState } from 'react';
import { AddClinicalNoteForm } from './AddClinicalNoteForm';

type PatientClinicalNotesCardProps = {
    patientId: number;
    notes: ClinicalNote[];
    // The acting membership's own appointment for today, or null when it
    // doesn't have one — drives whether "add note" is offered (issue #217).
    todaysAppointmentId: number | null;
};

function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString('es-AR', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

export function PatientClinicalNotesCard({
    patientId,
    notes,
    todaysAppointmentId,
}: PatientClinicalNotesCardProps) {
    const [showForm, setShowForm] = useState(false);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notas clínicas</CardTitle>
                {todaysAppointmentId !== null && (
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
                {todaysAppointmentId !== null && showForm && (
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
                        <div
                            key={note.id}
                            className="rounded-lg border p-3 text-sm"
                        >
                            <p className="whitespace-pre-wrap">{note.body}</p>
                            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>{note.author_name ?? '—'}</span>
                                <span>{formatTimestamp(note.created_at)}</span>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
