import type { Control } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { PrescriptionFormValues } from '@/lib/prescription-schema';

type PrescriptionItemFieldsProps = {
    control: Control<PrescriptionFormValues>;
    index: number;
    canRemove: boolean;
    onRemove: () => void;
};

// One medication row of the prescription form (`useFieldArray` item).
export function PrescriptionItemFields({
    control,
    index,
    canRemove,
    onRemove,
}: PrescriptionItemFieldsProps) {
    return (
        <fieldset className="relative space-y-2 rounded-lg border p-3 [&>legend~*]:clear-both">
            {/* The legend must be the fieldset's first child to name the group;
                the remove button stays outside it so it isn't part of that name. */}
            <legend className="float-left flex h-7 w-full items-center pr-20 text-sm font-medium">
                Medicamento {index + 1}
            </legend>
            {canRemove && (
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="absolute top-3 right-3"
                    onClick={onRemove}
                    aria-label={`Quitar medicamento ${index + 1}`}
                >
                    Quitar
                </Button>
            )}
            <FormField
                control={control}
                name={`items.${index}.medication`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Medicamento</FormLabel>
                        <FormControl
                            render={<Input maxLength={255} {...field} />}
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_6rem]">
                <FormField
                    control={control}
                    name={`items.${index}.presentation`}
                    render={({ field }) => (
                        <FormItem className="min-w-0">
                            <FormLabel>Presentación</FormLabel>
                            <FormControl
                                render={
                                    <Input
                                        maxLength={255}
                                        placeholder="Ej.: comprimidos 500 mg"
                                        {...field}
                                    />
                                }
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                        <FormItem className="min-w-0">
                            <FormLabel>Cantidad</FormLabel>
                            <FormControl
                                render={
                                    <Input
                                        type="number"
                                        inputMode="numeric"
                                        {...field}
                                    />
                                }
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <FormField
                control={control}
                name={`items.${index}.dosage`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Posología</FormLabel>
                        <FormControl
                            render={
                                <Input
                                    maxLength={500}
                                    placeholder="Ej.: 1 cada 8 h por 7 días"
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
