import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useId, useMemo } from 'react';

const ALL = 'all';

type FilterSelectProps<TValue extends string> = {
    label: string;
    /** `undefined` = no filter ("Todos"/"Todas"). */
    value: TValue | undefined;
    options: ReadonlyArray<{ value: TValue; label: string }>;
    allLabel: string;
    onChange: (value: TValue | undefined) => void;
};

/** A labelled list filter whose first option clears it; the selected option travels in the URL. */
export function FilterSelect<TValue extends string>({
    label,
    value,
    options,
    allLabel,
    onChange,
}: FilterSelectProps<TValue>) {
    const triggerId = useId();
    // Passed as `items` so the trigger shows the Spanish label before the listbox has ever opened.
    const items = useMemo(
        () => [{ value: ALL, label: allLabel }, ...options],
        [allLabel, options],
    );

    return (
        <div className="flex min-w-0 flex-col gap-1">
            <Label htmlFor={triggerId}>{label}</Label>
            <Select
                items={items}
                value={value ?? ALL}
                onValueChange={(next) =>
                    onChange(
                        next === ALL || next === null
                            ? undefined
                            : (next as TValue),
                    )
                }
            >
                <SelectTrigger id={triggerId} className="w-full sm:w-48">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {items.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
}
