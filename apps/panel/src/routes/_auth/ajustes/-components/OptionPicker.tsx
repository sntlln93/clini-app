import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useId } from 'react';

type OptionPickerProps = {
    label: string;
    placeholder: string;
    items: readonly { value: string; label: string }[];
    value: string | null;
    onChange: (value: string) => void;
    className?: string;
};

// A labeled pick of one fixed value (a province, a profession). `items` on
// the Select shows the label before the list opens (#67).
export function OptionPicker({
    label,
    placeholder,
    items,
    value,
    onChange,
    className,
}: OptionPickerProps) {
    const triggerId = useId();

    return (
        <div className={className ?? 'space-y-1'}>
            <Label
                htmlFor={triggerId}
                className="text-xs text-muted-foreground"
            >
                {label}
            </Label>
            <Select
                items={items}
                value={value}
                onValueChange={(next) => next !== null && onChange(next)}
            >
                <SelectTrigger id={triggerId} className="w-full">
                    <SelectValue placeholder={placeholder} />
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
