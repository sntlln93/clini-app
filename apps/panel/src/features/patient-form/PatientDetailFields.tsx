import type { Control } from 'react-hook-form';

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { InsuranceProvider, PatientPayload } from '@/types/patient';
import { PatientInsuranceFields } from './PatientInsuranceFields';
import { SEX_OPTIONS } from './patient-schemas';

type PatientDetailFieldsProps = {
    control: Control<PatientPayload>;
    insuranceProviders: InsuranceProvider[];
};

export function PatientDetailFields({
    control,
    insuranceProviders,
}: PatientDetailFieldsProps) {
    return (
        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                    control={control}
                    name="sex"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sexo (opcional)</FormLabel>
                            <FormControl
                                render={
                                    <RadioGroup
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        className="flex flex-col gap-2"
                                    />
                                }
                            >
                                {SEX_OPTIONS.map((option) => (
                                    <label
                                        key={option.value}
                                        className="flex items-center gap-2 text-sm"
                                    >
                                        <RadioGroupItem value={option.value} />
                                        {option.label}
                                    </label>
                                ))}
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="birth_date"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Fecha de nacimiento (opcional)
                            </FormLabel>
                            <FormControl
                                render={<Input type="date" {...field} />}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <PatientInsuranceFields
                control={control}
                insuranceProviders={insuranceProviders}
            />
        </>
    );
}
