import { useState } from 'react';
import { useFormContext, useWatch, type Control } from 'react-hook-form';

import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { PrescriptionFormValues } from '@/lib/prescription-schema';
import type { MedicationProduct } from '@/types/medication';
import { MedicationSuggestions } from './MedicationSuggestions';
import {
    useMedicationDetail,
    useMedicationSearch,
} from './use-medication-catalog';

type MedicationFieldProps = {
    control: Control<PrescriptionFormValues>;
    index: number;
};

// «Panadol» → «paracetamol 500 MG»: what the allergy warning compares (#377).
function activeIngredients(product: MedicationProduct): string {
    if (product.ingredients === null) {
        return product.generic_name;
    }

    return product.ingredients
        .map((ingredient) =>
            [ingredient.name, ingredient.quantity, ingredient.unit]
                .filter(Boolean)
                .join(' '),
        )
        .join(' + ');
}

// «Medicamento» of one item: free text, with suggestions from the medication
// catalog from five characters on (#377), only once the professional types in
// it: an amendment's prefilled name asks nothing. Picking one fills the name
// and the presentation and links the item to the product; typing again
// unlinks it.
export function MedicationField({ control, index }: MedicationFieldProps) {
    const { setValue } = useFormContext<PrescriptionFormValues>();
    const medication = useWatch({ control, name: `items.${index}.medication` });
    const gtin = useWatch({ control, name: `items.${index}.gtin` });
    const [typed, setTyped] = useState(false);
    const search = useMedicationSearch(typed && gtin === '' ? medication : '');
    const detail = useMedicationDetail(gtin);

    function pick(product: MedicationProduct) {
        const options = { shouldDirty: true, shouldValidate: true };
        setValue(`items.${index}.medication`, product.commercial_name, options);
        setValue(
            `items.${index}.presentation`,
            `${product.pharmaceutical_form}, ${product.presentation}`.toLowerCase(),
            options,
        );
        setValue(`items.${index}.gtin`, product.gtin, options);
        setTyped(false);
    }

    return (
        <FormField
            control={control}
            name={`items.${index}.medication`}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Medicamento</FormLabel>
                    <FormControl
                        render={
                            <Input
                                maxLength={255}
                                autoComplete="off"
                                {...field}
                                onChange={(event) => {
                                    field.onChange(event);
                                    setTyped(true);
                                    if (gtin !== '') {
                                        setValue(`items.${index}.gtin`, '');
                                    }
                                }}
                            />
                        }
                    />
                    {gtin !== '' && detail.data && (
                        <FormDescription>
                            Del Vademécum Nacional · Principio activo:{' '}
                            {activeIngredients(detail.data)}
                        </FormDescription>
                    )}
                    <FormMessage />
                    {search.isSearching && search.products.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                            Buscando en el Vademécum Nacional…
                        </p>
                    )}
                    <MedicationSuggestions
                        products={search.products}
                        onPick={pick}
                    />
                </FormItem>
            )}
        />
    );
}
