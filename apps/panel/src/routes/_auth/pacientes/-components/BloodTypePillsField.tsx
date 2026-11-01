import { Radio } from '@base-ui/react/radio';
import { useId } from 'react';
import type { Control, FieldPathByValue, FieldValues } from 'react-hook-form';

import { buttonVariants } from '@/components/ui/button';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { RadioGroup } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { BLOOD_TYPES } from '@/types/medical-history';

type BloodTypePillsFieldProps<T extends FieldValues> = {
    control: Control<T>;
    name: FieldPathByValue<T, string>;
};

// Every blood type in sight as a pill, so the professional scans and picks one
// in a single click instead of opening a select. A radio group: arrow keys move
// between them.
export function BloodTypePillsField<T extends FieldValues>({
    control,
    name,
}: BloodTypePillsFieldProps<T>) {
    const labelId = useId();

    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel id={labelId}>Grupo y factor</FormLabel>
                    <FormControl
                        render={
                            <RadioGroup
                                aria-labelledby={labelId}
                                value={field.value}
                                onValueChange={(value) => field.onChange(value)}
                                className="grid-cols-4 gap-2"
                            />
                        }
                    >
                        {BLOOD_TYPES.map((type) => (
                            <Radio.Root
                                key={type}
                                value={type}
                                className={cn(
                                    buttonVariants({
                                        variant: 'outline',
                                        size: 'lg',
                                    }),
                                    'w-full data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-checked:hover:bg-primary/90 data-checked:hover:text-primary-foreground dark:data-checked:bg-primary dark:data-checked:hover:bg-primary/90',
                                )}
                            >
                                {type}
                            </Radio.Root>
                        ))}
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
