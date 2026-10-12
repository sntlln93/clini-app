import {
    FormControl,
    FormDescription,
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
import type { InsuranceProvider } from '@/types/patient';
import { useMemo } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import type { BookingPatientFormValues } from './booking-patient-schema';

type BookingInsuranceFieldsProps = {
    control: Control<BookingPatientFormValues>;
    /** Only the ones the practice accepts (#291). */
    insuranceProviders: InsuranceProvider[];
};

// Same shape as the panel's patient form: the member number only exists next to a provider (#275).
export function BookingInsuranceFields({
    control,
    insuranceProviders,
}: BookingInsuranceFieldsProps) {
    const insuranceProviderId = useWatch({
        control,
        name: 'patient.insurance_provider_id',
    });
    const items = useMemo(
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
        <>
            <FormField
                control={control}
                name="patient.insurance_provider_id"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Obra social (opcional)</FormLabel>
                        <Select
                            items={items}
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
                                    {items.map((item) => (
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
                        <FormDescription>
                            Solo figuran las obras sociales que atiende el
                            consultorio.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {insuranceProviderId !== null && (
                <FormField
                    control={control}
                    name="patient.insurance_member_number"
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
        </>
    );
}
