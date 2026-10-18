import type { ReactNode } from 'react';

import { StatusPill } from '@/components/StatusPill';
import { formatShortDateTime } from '@/lib/datetime';
import type { ClinicalNote } from '@/types/clinical-note';
import { VersionHistory } from './VersionHistory';

type ClinicalNoteEntryProps = {
    note: ClinicalNote;
    // Who/when, at the start of the footer row.
    meta: ReactNode;
    actions?: ReactNode;
};

// One note as the clinical history keeps it (#323): the current text, every
// earlier version, and an annulled note's text behind a disclosure, since it
// no longer counts but is never erased.
export function ClinicalNoteEntry({
    note,
    meta,
    actions,
}: ClinicalNoteEntryProps) {
    return (
        <div className="rounded-lg border p-3 text-sm">
            {note.annulment ? (
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone="neutral">Anulada</StatusPill>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            el {formatShortDateTime(note.annulment.created_at)}
                        </span>
                    </div>
                    <p className="wrap-break-word text-muted-foreground">
                        Motivo: {note.annulment.reason}
                    </p>
                    <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground select-none">
                            Ver el texto anulado
                        </summary>
                        <p className="mt-2 text-sm whitespace-pre-wrap">
                            {note.body}
                        </p>
                    </details>
                </div>
            ) : (
                <p className="whitespace-pre-wrap">{note.body}</p>
            )}
            <VersionHistory
                versions={note.versions}
                renderContent={(version) => (
                    <p className="whitespace-pre-wrap">{version.body}</p>
                )}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                {meta}
                {actions}
            </div>
        </div>
    );
}
