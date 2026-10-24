import { useWatch, type Control } from 'react-hook-form';

import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
    CLINICAL_ACCESS_REASON_LABELS,
    CLINICAL_ACCESS_REASONS,
} from '@/lib/clinical-access';
import type {
    ExceptionalAccessFormOutput,
    ExceptionalAccessFormValues,
} from './exceptional-access-schema';

export function ExceptionalAccessFields({
    control,
}: {
    control: Control<
        ExceptionalAccessFormValues,
        unknown,
        ExceptionalAccessFormOutput
    >;
}) {
    const reason = useWatch({ control, name: 'reason' });

    return (
        <>
            <FormField
                control={control}
                name="reason"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Motivo</FormLabel>
                        <FormControl
                            render={
                                <RadioGroup
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    className="flex flex-col gap-2"
                                />
                            }
                        >
                            {CLINICAL_ACCESS_REASONS.map((option) => (
                                <label
                                    key={option}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <RadioGroupItem value={option} />
                                    {CLINICAL_ACCESS_REASON_LABELS[option]}
                                </label>
                            ))}
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="reason_detail"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            {reason === 'other'
                                ? 'Detalle'
                                : 'Detalle (opcional)'}
                        </FormLabel>
                        <FormControl
                            render={<Textarea maxLength={500} {...field} />}
                        />
                        <FormDescription>
                            No escribas datos clínicos: alcanza con el motivo.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    );
}
