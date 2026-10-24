import type { ReactNode } from 'react';

import { formatShortDateTime } from '@/lib/datetime';
import { ClinicalRecordStatusChip } from './ClinicalRecordStatusChip';

type HistoryVersion = {
    version: number;
    reason: string | null;
    created_at: string;
};

type VersionHistoryProps<T extends HistoryVersion> = {
    versions: T[];
    renderContent: (version: T) => ReactNode;
};

// Every version of an amended record, newest first, behind a disclosure: the
// clinical history keeps what was written before a correction (#323).
export function VersionHistory<T extends HistoryVersion>({
    versions,
    renderContent,
}: VersionHistoryProps<T>) {
    const current = versions.at(-1);

    if (current === undefined || versions.length < 2) {
        return null;
    }

    return (
        <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground select-none">
                <ClinicalRecordStatusChip status="amended" className="mr-1.5" />
                el {formatShortDateTime(current.created_at)} · Ver las{' '}
                {versions.length} versiones
            </summary>
            <ol className="mt-2 space-y-2">
                {[...versions].reverse().map((version) => (
                    <li
                        key={version.version}
                        className="space-y-1 rounded-md bg-muted/50 p-2"
                    >
                        <p className="text-muted-foreground tabular-nums">
                            Versión {version.version}
                            {version === current && ' (actual)'} ·{' '}
                            {formatShortDateTime(version.created_at)}
                        </p>
                        {version.reason && (
                            <p className="text-muted-foreground">
                                Motivo: {version.reason}
                            </p>
                        )}
                        <div className="text-sm">{renderContent(version)}</div>
                    </li>
                ))}
            </ol>
        </details>
    );
}
