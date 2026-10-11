import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useId } from 'react';

type DateRangeFieldsProps = {
    from: string | undefined;
    to: string | undefined;
    onChange: (range: { from?: string; to?: string }) => void;
    /** Shown under the fields, e.g. a `to < from` warning. */
    error?: string | null;
};

/** Two native date inputs ("Desde"/"Hasta", local `Y-m-d`); an emptied field clears that bound. */
export function DateRangeFields({
    from,
    to,
    onChange,
    error,
}: DateRangeFieldsProps) {
    const fromId = useId();
    const toId = useId();
    const errorId = useId();

    return (
        <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap gap-3">
                <div className="flex flex-col gap-1">
                    <Label htmlFor={fromId}>Desde</Label>
                    <Input
                        id={fromId}
                        type="date"
                        value={from ?? ''}
                        max={to}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? errorId : undefined}
                        onChange={(event) =>
                            onChange({
                                from: event.target.value || undefined,
                                to,
                            })
                        }
                        className="w-40"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <Label htmlFor={toId}>Hasta</Label>
                    <Input
                        id={toId}
                        type="date"
                        value={to ?? ''}
                        min={from}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? errorId : undefined}
                        onChange={(event) =>
                            onChange({
                                from,
                                to: event.target.value || undefined,
                            })
                        }
                        className="w-40"
                    />
                </div>
            </div>
            {error && (
                <p
                    id={errorId}
                    role="alert"
                    className="text-sm text-destructive"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
