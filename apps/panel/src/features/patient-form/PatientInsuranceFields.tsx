import { useMemo } from 'react';
import { type Control, useWatch } from 'react-hook-form';

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { InsuranceProvider, PatientPayload } from '@/types/patient';

type PatientInsuranceFieldsProps = {
    control: Control<PatientPayload>;
    insuranceProviders: InsuranceProvider[];
};

// The member number only exists next to a provider (#275), so it shows up once one is chosen.
export function PatientInsuranceFields({
    control,
    insuranceProviders,
}: PatientInsuranceFieldsProps) {
    const insuranceProviderId = useWatch({
        control,
        name: 'insurance_provider_id',
    });
    // A `null` item lets a provider picked by mistake be undone, now that it makes the number mandatory.
    const insuranceProviderItems = useMemo(
        () => [
            { value: null, label: 'Sin obra social' },
            ...insuranceProviders.map((provider) => ({
                value: String(provider.id),
                label: provider.name,
            })),
        ],
        [insuranceProviders],
    );

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
                control={control}
                name="insurance_provider_id"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Obra social (opcional)</FormLabel>
                        <Select
                            items={insuranceProviderItems}
                            value={field.value ? String(field.value) : null}
                            onValueChange={(value) =>
                                field.onChange(value ? Number(value) : null)
                            }
                        >
                            <FormControl
                                render={<SelectTrigger className="w-full" />}
                            >
                                <SelectValue />
                            </FormControl>
                            <SelectContent>
                                <SelectGroup>
                                    {insuranceProviderItems.map((item) => (
                                        <SelectItem
                                            key={item.value ?? 'none'}
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

            {insuranceProviderId !== null && (
                <FormField
                    control={control}
                    name="insurance_member_number"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>N° de afiliado</FormLabel>
                            <FormControl
                                render={<Input autoComplete="off" {...field} />}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>
    );
}
