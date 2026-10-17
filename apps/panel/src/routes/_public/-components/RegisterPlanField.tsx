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
import type { RegisterFormValues } from './RegisterForm';

/**
 * The plans a visitor picks from when registering (#286), by the landing's
 * slugs (its CTAs link to `/registro?plan=…`). Centro is assigned by the
 * Clini team, never self-serve, so it isn't one.
 */
export const REGISTER_PLANS = ['gratis', 'consultorio'] as const;

export type RegisterPlan = (typeof REGISTER_PLANS)[number];

const OPTIONS: { value: RegisterPlan; title: string; description: string }[] = [
    {
        value: 'gratis',
        title: 'Gratis',
        description: 'Agenda y reserva online para un profesional, sin costo.',
    },
    {
        value: 'consultorio',
        title: 'Consultorio',
        description:
            'Equipo, sala de espera, recetas y más. Al crear la cuenta te llevamos a Mercado Pago para el pago.',
    },
];

export function RegisterPlanField({
    control,
}: {
    control: Control<RegisterFormValues>;
}) {
    const idPrefix = useId();

    return (
        <FormField
            control={control}
            name="plan"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Plan</FormLabel>
                    <FormControl
                        render={
                            <RadioGroup
                                value={field.value}
                                onValueChange={field.onChange}
                                className="flex flex-col gap-4"
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
