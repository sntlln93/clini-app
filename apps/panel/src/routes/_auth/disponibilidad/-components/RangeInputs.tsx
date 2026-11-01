import { TimeInput } from '@/components/TimeInput';
import { Label } from '@/components/ui/label';
import { useId } from 'react';

type RangeInputsProps = {
    values: { start: string; end: string };
    error: string | null;
    disabled?: boolean;
    onStartChange: (value: string) => void;
    onEndChange: (value: string) => void;
    /** Leaving an input or pressing Enter in it, with both final values. */
    onCommit?: (values: { start: string; end: string }) => void;
};

/** Desde/Hasta as 24-hour time fields, stepping by the grid's 15 minutes. */
export function RangeInputs({
    values,
    error,
    disabled,
    onStartChange,
    onEndChange,
    onCommit,
}: RangeInputsProps) {
    const id = useId();
    const fields = [
        {
            key: 'start',
            label: 'Desde',
            value: values.start,
            onChange: onStartChange,
        },
        {
            key: 'end',
            label: 'Hasta',
            value: values.end,
            onChange: onEndChange,
        },
    ];

    return (
        <div className="space-y-1">
            <div className="grid grid-cols-2 gap-2">
                {fields.map((field) => (
                    <div key={field.key} className="min-w-0 space-y-1">
                        <Label
                            htmlFor={`${id}-${field.key}`}
                            className="text-xs text-muted-foreground"
                        >
                            {field.label}
                        </Label>
                        <TimeInput
                            id={`${id}-${field.key}`}
                            required
                            disabled={disabled}
                            value={field.value}
                            aria-invalid={error !== null || undefined}
                            aria-describedby={error ? `${id}-error` : undefined}
                            onChange={field.onChange}
                            onCommit={(value) =>
                                onCommit?.({ ...values, [field.key]: value })
                            }
                        />
                    </div>
                ))}
            </div>
            {error && (
                <p id={`${id}-error`} className="text-xs text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
