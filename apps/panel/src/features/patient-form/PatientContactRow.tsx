import { useWatch, type Control } from 'react-hook-form';

import { Button } from '@/components/ui/button';
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
import { CONTACT_TYPE_OPTIONS } from '@/lib/patient-contacts';
import type { PatientPayload } from '@/types/patient';

type PatientContactRowProps = {
    control: Control<PatientPayload>;
    index: number;
    onRemove: () => void;
};

const VALUE_PLACEHOLDERS = {
    phone: 'Ej.: 11 2345-6789',
    whatsapp: 'Ej.: 11 2345-6789',
    email: 'Ej.: nombre@correo.com',
} as const;

// One contact of the patient form's list (`useFieldArray` item, #365).
export function PatientContactRow({
    control,
    index,
    onRemove,
}: PatientContactRowProps) {
    const type = useWatch({ control, name: `contacts.${index}.type` });
    const needsConfirmation = useWatch({
        control,
        name: `contacts.${index}.needs_confirmation`,
    });

    return (
        <fieldset className="relative space-y-2 rounded-lg border p-3 [&>legend~*]:clear-both">
            {/* The legend must be the fieldset's first child to name the group;
                the remove button stays outside it so it isn't part of that name. */}
            <legend className="float-left flex h-7 w-full items-center pr-20 text-sm font-medium">
                Contacto {index + 1}
            </legend>
            <Button
                type="button"
                size="sm"
                variant="ghost"
                className="absolute top-3 right-3"
                onClick={onRemove}
                aria-label={`Quitar contacto ${index + 1}`}
            >
                Quitar
            </Button>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_1fr]">
                <FormField
                    control={control}
                    name={`contacts.${index}.type`}
                    render={({ field }) => (
                        <FormItem className="min-w-0">
                            <FormLabel>Tipo</FormLabel>
                            <Select
                                items={CONTACT_TYPE_OPTIONS}
                                value={field.value}
                                onValueChange={(value) =>
                                    value && field.onChange(value)
                                }
                            >
                                <FormControl
                                    render={
                                        <SelectTrigger className="w-full" />
                                    }
                                >
                                    <SelectValue />
                                </FormControl>
                                <SelectContent>
                                    <SelectGroup>
                                        {CONTACT_TYPE_OPTIONS.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name={`contacts.${index}.value`}
                    render={({ field }) => (
                        <FormItem className="min-w-0">
                            <FormLabel>
                                {type === 'email' ? 'Correo' : 'Número'}
                            </FormLabel>
                            <FormControl
                                render={
                                    <Input
                                        type={
                                            type === 'email' ? 'email' : 'tel'
                                        }
                                        maxLength={255}
                                        placeholder={VALUE_PLACEHOLDERS[type]}
                                        {...field}
                                    />
                                }
                            />
                            {needsConfirmation && (
                                <FormDescription>
                                    Lo agregó una reserva online y todavía no
                                    recibe recordatorios. Al guardar queda
                                    confirmado; quitalo si no es del paciente.
                                </FormDescription>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <FormField
                control={control}
                name={`contacts.${index}.label`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Etiqueta (opcional)</FormLabel>
                        <FormControl
                            render={
                                <Input
                                    maxLength={50}
                                    placeholder="Ej.: madre, trabajo"
                                    {...field}
                                />
                            }
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />
        </fieldset>
    );
}
