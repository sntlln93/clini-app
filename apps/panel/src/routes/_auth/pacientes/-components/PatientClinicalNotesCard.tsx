import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ClinicalNote } from '@/types/clinical-note';

type PatientClinicalNotesCardProps = {
    notes: ClinicalNote[];
};

function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString('es-AR', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

export function PatientClinicalNotesCard({
    notes,
}: PatientClinicalNotesCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Notas clínicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
