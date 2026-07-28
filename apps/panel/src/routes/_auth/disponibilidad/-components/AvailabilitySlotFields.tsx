import type { Control } from 'react-hook-form';

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { AvailabilitySlotFormValues } from './availability-schemas';

type AvailabilitySlotFieldsProps = {
    control: Control<AvailabilitySlotFormValues>;
    canManage: boolean;
};

const TIME_FIELDS: {
    name: keyof AvailabilitySlotFormValues;
    label: string;
}[] = [
    { name: 'startTime', label: 'Desde' },
    { name: 'endTime', label: 'Hasta' },
];

export function AvailabilitySlotFields({
    control,
    canManage,
}: AvailabilitySlotFieldsProps) {
    return (
        <>
            {TIME_FIELDS.map(({ name, label }) => (
                <FormField
                    key={name}
                    control={control}
                    name={name}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                                {label}
                            </FormLabel>
                            <FormControl
                                render={
                                    <Input
                                        type="time"
                                        disabled={!canManage}
                                        className="w-28"
                                        {...field}
                                    />
                                }
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ))}
        </>
    );
}
