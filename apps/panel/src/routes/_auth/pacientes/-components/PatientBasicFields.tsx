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
import type { PatientPayload } from '@/types/patient';
import { DOCUMENT_TYPE_OPTIONS } from './patient-schemas';

type PatientBasicFieldsProps = {
    control: Control<PatientPayload>;
};

export function PatientBasicFields({ control }: PatientBasicFieldsProps) {
    return (
        <>
            <FormField
                control={control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl render={<Input {...field} />} />
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                    control={control}
                    name="document_type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de documento</FormLabel>
                            <FormControl
                                render={
                                    <RadioGroup
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        className="flex flex-col gap-2"
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
                    name="document_number"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Número de documento</FormLabel>
                            <FormControl render={<Input {...field} />} />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
                control={control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Correo electrónico</FormLabel>
                        <FormControl
                            render={<Input type="email" {...field} />}
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl render={<Input {...field} />} />
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    );
}
