import { Button } from '@/components/ui/button';
import { formatShortDateTime } from '@/lib/datetime';
import type { BloodTypeRecord } from '@/types/medical-history';

type BloodTypeSectionProps = {
    // Newest first: the first is the current one (ADR 0027).
    records: BloodTypeRecord[];
    // Null when nothing can be recorded now.
    onRecord: (() => void) | null;
};

// The current blood type, who recorded it, and every earlier value behind a
// disclosure: changing it records the new one instead of overwriting (#361).
export function BloodTypeSection({ records, onRecord }: BloodTypeSectionProps) {
    const [current, ...earlier] = records;

    return (
        <section aria-labelledby="blood-type-title" className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="blood-type-title" className="text-sm font-medium">
                    Grupo sanguíneo
                </h3>
                {onRecord && (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={onRecord}
                    >
                        {current ? 'Cambiar' : 'Registrar'}
                    </Button>
                )}
            </div>
            {current ? (
                <p className="text-sm">
                    <span className="text-base font-medium">
                        {current.blood_type}
                    </span>{' '}
                    <span className="text-xs text-muted-foreground">
                        · {current.author_name ?? '—'} ·{' '}
                        <span className="tabular-nums">
                            {formatShortDateTime(current.created_at)}
                        </span>
                        {current.reason && ` · Motivo: ${current.reason}`}
                    </span>
                </p>
            ) : (
                <p className="text-sm text-muted-foreground">Sin registrar.</p>
            )}
            {earlier.length > 0 && (
                <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground select-none">
                        Ver los valores anteriores
                    </summary>
                    <ul className="mt-2 space-y-1">
                        {earlier.map((record) => (
                            <li
                                key={record.id}
                                className="text-muted-foreground"
                            >
                                <span className="font-medium text-foreground">
                                    {record.blood_type}
                                </span>{' '}
                                · {record.author_name ?? '—'} ·{' '}
                                <span className="tabular-nums">
                                    {formatShortDateTime(record.created_at)}
                                </span>
                                {record.reason && ` · Motivo: ${record.reason}`}
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </section>
    );
}
