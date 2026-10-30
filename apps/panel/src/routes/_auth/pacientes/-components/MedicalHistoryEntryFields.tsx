import type { Control } from 'react-hook-form';

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { SEVERITY_LABELS } from '@/lib/medical-history';
import type { MedicalHistoryEntryFormValues } from '@/lib/medical-history-schema';
import {
    ALLERGY_SEVERITIES,
    type MedicalHistoryCategory,
} from '@/types/medical-history';
import { OptionSelectField } from './OptionSelectField';

const SEVERITY_ITEMS = ALLERGY_SEVERITIES.map((severity) => ({
    value: severity,
    label: SEVERITY_LABELS[severity],
}));

type TextFieldProps = {
    control: Control<MedicalHistoryEntryFormValues>;
    name: 'description' | 'reaction' | 'approximate_date';
    label: string;
    maxLength: number;
    placeholder?: string;
};

function TextField({
    control,
    name,
    label,
    maxLength,
    placeholder,
}: TextFieldProps) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl
                        render={
                            <Input
                                maxLength={maxLength}
                                placeholder={placeholder}
                                {...field}
                            />
                        }
                    />
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

// An allergy names the substance and may say its reaction and severity; an
// antecedent is free text with an optional approximate date (#361).
export function MedicalHistoryEntryFields({
    control,
    category,
}: {
    control: Control<MedicalHistoryEntryFormValues>;
    category: MedicalHistoryCategory;
}) {
    if (category === 'allergy') {
        return (
            <>
                <TextField
                    control={control}
                    name="description"
                    label="Sustancia"
                    maxLength={500}
                />
                <TextField
                    control={control}
                    name="reaction"
                    label="Reacción (opcional)"
                    maxLength={255}
                    placeholder="Ej.: urticaria"
                />
                <OptionSelectField
                    control={control}
                    name="severity"
                    label="Severidad (opcional)"
                    placeholder="Sin indicar"
                    items={SEVERITY_ITEMS}
                />
            </>
        );
    }

    return (
        <>
            <TextField
                control={control}
                name="description"
                label="Descripción"
                maxLength={500}
            />
            <TextField
                control={control}
                name="approximate_date"
                label="Fecha aproximada (opcional)"
                maxLength={50}
                placeholder="Ej.: 2015, en la infancia"
            />
        </>
    );
}
