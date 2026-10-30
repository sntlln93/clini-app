import type { Control, FieldPathByValue, FieldValues } from 'react-hook-form';

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type OptionSelectFieldProps<T extends FieldValues> = {
    control: Control<T>;
    name: FieldPathByValue<T, string>;
    label: string;
    placeholder: string;
    // `items` per call site, so the trigger shows the label (#67).
    items: { value: string; label: string }[];
};

// A form field that picks one of a fixed list of string values.
export function OptionSelectField<T extends FieldValues>({
    control,
    name,
    label,
    placeholder,
    items,
}: OptionSelectFieldProps<T>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <Select
                        items={items}
                        value={field.value}
                        onValueChange={(value) => field.onChange(value ?? '')}
                    >
                        <FormControl
                            render={<SelectTrigger className="w-full" />}
                        >
                            <SelectValue placeholder={placeholder} />
                        </FormControl>
                        <SelectContent>
                            <SelectGroup>
                                {items.map((item) => (
                                    <SelectItem
                                        key={item.value}
                                        value={item.value}
                                    >
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
