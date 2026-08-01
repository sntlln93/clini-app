import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Control } from 'react-hook-form';
import type { BookingPatientFormValues } from './booking-patient-schema';

const DOCUMENT_TYPE_OPTIONS = [
    { value: 'dni' as const, label: 'DNI' },
    { value: 'passport' as const, label: 'Pasaporte' },
    { value: 'insurance_id' as const, label: 'Carnet de obra social' },
];

type BookingPatientFormFieldsProps = {
    control: Control<BookingPatientFormValues>;
};

export function BookingPatientFormFields({
    control,
}: BookingPatientFormFieldsProps) {
    return (
        <>
            <FormField
                control={control}
                name="patient.name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl render={<Input {...field} />} />
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="patient.document_type"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo de documento</FormLabel>
                        <FormControl
                            render={
                                <RadioGroup
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    className="flex flex-row flex-wrap gap-4"
                                />
                            }
                        >
                            {DOCUMENT_TYPE_OPTIONS.map((option) => (
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
                name="patient.document_number"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Número de documento</FormLabel>
                        <FormControl render={<Input {...field} />} />
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="patient.email"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Correo electrónico (opcional)</FormLabel>
                        <FormControl
                            render={<Input type="email" {...field} />}
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="patient.phone"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Teléfono (opcional)</FormLabel>
                        <FormControl render={<Input {...field} />} />
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    );
}
