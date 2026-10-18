import type { Control, FieldPathByValue, FieldValues } from 'react-hook-form';

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

type AmendmentReasonFieldProps<T extends FieldValues> = {
    control: Control<T>;
    name: FieldPathByValue<T, string>;
};

// The optional reason an amendment keeps next to the new version (#323).
export function AmendmentReasonField<T extends FieldValues>({
    control,
    name,
}: AmendmentReasonFieldProps<T>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Motivo de la enmienda (opcional)</FormLabel>
                    <FormControl
                        render={<Input maxLength={500} {...field} />}
                    />
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
