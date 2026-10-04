import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { ComponentProps } from 'react';

export type SelectableItem = { value: string; label: string };

type BookingSelectFieldProps = {
    id: string;
    label: string;
    items: SelectableItem[];
    value?: string;
    placeholder: string;
    onValueChange: NonNullable<ComponentProps<typeof Select>['onValueChange']>;
};

export function BookingSelectField({
    id,
    label,
    items,
    value,
    placeholder,
    onValueChange,
}: BookingSelectFieldProps) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Select items={items} value={value} onValueChange={onValueChange}>
                <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
