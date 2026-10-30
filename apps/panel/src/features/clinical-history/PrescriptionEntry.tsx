import type { ReactNode } from 'react';

import { formatShortDateTime } from '@/lib/datetime';
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

// Its professional confirmed an allergy warning to indicate it (#362).
function AllergyWarningNote() {
    return (
        <p className="mt-1 text-xs text-muted-foreground">
            Indicada pese a un aviso de alergia.
        </p>
    );
}

// One indicated-medication record as the clinical history keeps it (#323):
// the current items and every earlier version. Annulled medication says when
// and why, with its items behind a disclosure, as an annulled note's text
// (#344): it no longer counts but is never erased.
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
                        <span className="text-xs text-muted-foreground tabular-nums">
                            el {formatShortDateTime(annulment.created_at)}
                        </span>
                    </div>
                    <p className="wrap-break-word text-muted-foreground">
                        Motivo: {annulment.reason}
                    </p>
                    <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground select-none">
                            Ver la medicación anulada
                        </summary>
                        <div className="mt-2 text-sm">{children}</div>
                    </details>
                </div>
            ) : (
                <>
                    {children}
                    {prescription.allergy_warning_overridden && (
                        <AllergyWarningNote />
                    )}
                </>
            )}
            <VersionHistory
                versions={prescription.versions}
                renderContent={(version) => (
                    <>
                        <PrescriptionItemList items={version.items} />
                        {version.allergy_warning_overridden && (
                            <AllergyWarningNote />
                        )}
                    </>
                )}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                {meta}
                {actions}
            </div>
        </div>
    );
}
