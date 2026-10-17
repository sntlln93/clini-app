import { useId } from 'react';
import type { Control } from 'react-hook-form';

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { SubscriptionBilling } from '@/types/subscription';
import type { RegisterFormValues } from './RegisterForm';

/**
 * The landing's slugs for how Consultorio is paid (its CTAs link to
 * `/registro?plan=consultorio&pago=…`, #240), by the billing each means.
 */
export const REGISTER_BILLING_SLUGS = ['mensual', 'anual'] as const;

export const REGISTER_BILLINGS: Record<
    (typeof REGISTER_BILLING_SLUGS)[number],
    SubscriptionBilling
> = { mensual: 'monthly', anual: 'annual' };

const OPTIONS: {
    value: SubscriptionBilling;
    title: string;
    description: string;
}[] = [
    {
        value: 'monthly',
        title: 'Mensual',
        description: 'Débito automático todos los meses.',
    },
    {
        value: 'annual',
        title: 'Anual',
        description: 'Un pago por año, con descuento.',
    },
];

/** How Consultorio is paid, asked only once it is the chosen plan. */
export function RegisterBillingField({
    control,
}: {
    control: Control<RegisterFormValues>;
}) {
    const idPrefix = useId();

    return (
        <FormField
            control={control}
            name="billing"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Forma de pago</FormLabel>
                    <FormControl
                        render={
                            <RadioGroup
                                value={field.value}
                                onValueChange={field.onChange}
                                className="grid grid-cols-2 gap-4"
                            />
                        }
                    >
                        {OPTIONS.map((option) => (
                            <label
                                key={option.value}
                                htmlFor={`${idPrefix}-${option.value}`}
                                className="flex items-start gap-2 rounded-md border p-3 text-sm has-data-checked:border-primary"
                            >
                                <RadioGroupItem
                                    id={`${idPrefix}-${option.value}`}
                                    value={option.value}
                                    className="mt-0.5"
                                />
                                <span className="space-y-0.5">
                                    <span className="block font-medium">
                                        {option.title}
                                    </span>
                                    <span className="block text-muted-foreground">
                                        {option.description}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
