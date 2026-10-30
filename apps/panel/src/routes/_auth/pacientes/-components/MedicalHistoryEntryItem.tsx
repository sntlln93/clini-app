import type { ReactNode } from 'react';

import { ClinicalRecordStatusChip } from '@/features/clinical-history/ClinicalRecordStatusChip';
import { VersionHistory } from '@/features/clinical-history/VersionHistory';
import { formatShortDateTime } from '@/lib/datetime';
import { entryDetails } from '@/lib/medical-history';
import type {
    MedicalHistoryContent,
    MedicalHistoryEntry,
} from '@/types/medical-history';

function Content({ content }: { content: MedicalHistoryContent }) {
    const details = entryDetails(content);

    return (
        <div className="wrap-break-word">
            <p className="font-medium">{content.description}</p>
            {details && <p className="text-muted-foreground">{details}</p>}
        </div>
    );
}

type MedicalHistoryEntryItemProps = {
    entry: MedicalHistoryEntry;
    actions?: ReactNode;
};

// One allergy or antecedent as the history keeps it (#361): its current text,
// every earlier version and, once withdrawn, since when it no longer applies.
export function MedicalHistoryEntryItem({
    entry,
    actions,
}: MedicalHistoryEntryItemProps) {
    const { withdrawal } = entry;

    return (
        <li className="rounded-lg border p-3 text-sm">
            <div className={withdrawal ? 'text-muted-foreground' : undefined}>
                <Content content={entry} />
            </div>
            {withdrawal && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <ClinicalRecordStatusChip status="withdrawn" />
                    <span className="tabular-nums">
                        desde el {formatShortDateTime(withdrawal.created_at)}
                    </span>
                    {withdrawal.reason && (
                        <span className="wrap-break-word">
                            · Motivo: {withdrawal.reason}
                        </span>
                    )}
                </div>
            )}
            <VersionHistory
                versions={entry.versions}
                renderContent={(version) => <Content content={version} />}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                    {entry.author_name ?? '—'} ·{' '}
                    <span className="tabular-nums">
                        {formatShortDateTime(entry.created_at)}
                    </span>
                </span>
                {actions}
            </div>
        </li>
    );
}
