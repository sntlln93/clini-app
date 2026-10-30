import type { ReactNode } from 'react';

import { ClinicalRecordStatusChip } from '@/features/clinical-history/ClinicalRecordStatusChip';
import { VersionHistory } from '@/features/clinical-history/VersionHistory';
import { formatShortDateTime } from '@/lib/datetime';
import { presentValues } from '@/lib/vital-signs';
import type { VitalSign, VitalSignValues } from '@/types/vital-sign';

function ValueList({ values }: { values: VitalSignValues }) {
    return (
        <dl className="flex flex-wrap gap-x-4 gap-y-1">
            {presentValues(values).map(({ field, label, value }) => (
                <div key={field} className="flex gap-1">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium tabular-nums">{value}</dd>
                </div>
            ))}
        </dl>
    );
}

type VitalSignEntryProps = {
    vitalSign: VitalSign;
    actions?: ReactNode;
};

// One measurement as the history keeps it (#361): its current values, every
// earlier version and, once annulled, when and why, with its values behind a
// disclosure — it left the series but is never erased.
export function VitalSignEntry({ vitalSign, actions }: VitalSignEntryProps) {
    const { annulment } = vitalSign;

    return (
        <li className="rounded-lg border p-3 text-sm">
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
                            Ver la medición anulada
                        </summary>
                        <div className="mt-2 text-sm">
                            <ValueList values={vitalSign.values} />
                        </div>
                    </details>
                </div>
            ) : (
                <ValueList values={vitalSign.values} />
            )}
            <VersionHistory
                versions={vitalSign.versions}
                renderContent={(version) => (
                    <ValueList values={version.values} />
                )}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                    {vitalSign.author_name ?? '—'} ·{' '}
                    <span className="tabular-nums">
                        {formatShortDateTime(vitalSign.measured_at)}
                    </span>
                </span>
                {actions}
            </div>
        </li>
    );
}
