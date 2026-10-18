import type { ReactNode } from 'react';

import type { Prescription } from '@/types/prescription';
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
// the current items and every earlier version.
export function PrescriptionEntry({
    prescription,
    children,
    meta,
    actions,
}: PrescriptionEntryProps) {
    return (
        <div className="rounded-lg border p-3 text-sm">
            {children}
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
