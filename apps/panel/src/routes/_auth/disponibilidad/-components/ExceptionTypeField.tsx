import { Radio } from '@base-ui/react/radio';
import { useId } from 'react';
import type { Control } from 'react-hook-form';

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
import type { AvailabilityExceptionType } from '@/types/availability';
import type { ExceptionFormValues } from './exception-form';
import { EXCEPTION_TYPE_LABELS } from './exception-format';

const TYPES: AvailabilityExceptionType[] = ['blocked', 'extra'];

type ExceptionTypeFieldProps = {
    control: Control<ExceptionFormValues>;
    /** An organization-wide exception can only block hours. */
    extraDisabled: boolean;
};

// The two kinds side by side as pills; a radio group, so arrow keys move
// between them.
export function ExceptionTypeField({
    control,
    extraDisabled,
}: ExceptionTypeFieldProps) {
    const labelId = useId();

    return (
        <FormField
            control={control}
            name="type"
            render={({ field }) => (
                <FormItem>
                    <FormLabel id={labelId}>Tipo</FormLabel>
                    <FormControl
                        render={
                            <RadioGroup
                                aria-labelledby={labelId}
                                value={field.value}
                                onValueChange={(value) => field.onChange(value)}
                                className="grid-cols-2 gap-2"
                            />
                        }
                    >
                        {TYPES.map((type) => (
                            <Radio.Root
                                key={type}
                                value={type}
                                disabled={type === 'extra' && extraDisabled}
                                className={cn(
                                    buttonVariants({ variant: 'outline' }),
                                    // The outline variant's dark border and hover colors would
                                    // otherwise hide which one is picked.
                                    'w-full min-w-0 data-checked:border-primary data-checked:bg-muted/60 data-checked:text-primary data-checked:hover:bg-muted/60 data-checked:hover:text-primary dark:data-checked:border-primary dark:data-checked:bg-muted/60',
                                )}
                            >
                                {EXCEPTION_TYPE_LABELS[type]}
                            </Radio.Root>
                        ))}
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
