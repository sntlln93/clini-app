import type { ReactNode } from 'react';

import { formatShortDateTime } from '@/lib/datetime';
import { PRESCRIPTION_ANNULMENT_KIND_LABELS } from '@/lib/prescription-annulment';
import type { Prescription } from '@/types/prescription';
import { ClinicalRecordStatusChip } from './ClinicalRecordStatusChip';
import { PrescriptionItemList } from './PrescriptionItemList';
import { VersionHistory } from './VersionHistory';

type PrescriptionEntryProps = {
    prescription: Prescription;
    // The current items, as each page shows them.
    children: ReactNode;
    // When it was indicated, at the start of the footer row.
    meta: ReactNode;
    actions?: ReactNode;
};

// One indicated-medication record as the clinical history keeps it (#323):
// the current items and every earlier version. Annulled medication says how,
// when and why (#344); what was never needed goes behind a disclosure, as an
// annulled note's text does, since it never applied, while what is no longer
// needed stays in view as the treatment it was.
export function PrescriptionEntry({
    prescription,
    children,
    meta,
    actions,
}: PrescriptionEntryProps) {
    const { annulment } = prescription;

    return (
        <div className="rounded-lg border p-3 text-sm">
            {annulment ? (
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <ClinicalRecordStatusChip status="annulled" />
                        <span className="text-xs font-medium">
                            {PRESCRIPTION_ANNULMENT_KIND_LABELS[annulment.kind]}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            el {formatShortDateTime(annulment.created_at)}
                        </span>
                    </div>
                    <p className="wrap-break-word text-muted-foreground">
                        Motivo: {annulment.reason}
                    </p>
                    {annulment.kind === 'never_needed' ? (
                        <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground select-none">
                                Ver la medicación anulada
                            </summary>
                            <div className="mt-2 text-sm">{children}</div>
                        </details>
                    ) : (
                        children
                    )}
                </div>
            ) : (
                children
            )}
            <VersionHistory
                versions={prescription.versions}
                renderContent={(version) => (
                    <PrescriptionItemList items={version.items} />
                )}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                {meta}
                {actions}
            </div>
        </div>
    );
}
