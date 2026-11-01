import { useState } from 'react';
import type { Control } from 'react-hook-form';

import {
    Combobox,
    ComboboxContent,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from '@/components/ui/combobox';
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import type { PrescriptionFormValues } from '@/lib/prescription-schema';
import type { MedicationProduct } from '@/types/medication';
import { MedicationSuggestion } from './MedicationSuggestion';
import { PickedMedication } from './PickedMedication';
import { useMedicationPick } from './use-medication-pick';

type MedicationFieldProps = {
    control: Control<PrescriptionFormValues>;
    index: number;
};

// What a screen reader hears of the suggestions. While the list is open
// base-ui hides the rest of the page from it, so the count is announced from
// inside the list, and the search and «none» from outside.
function countStatus(count: number): string {
    return count === 1 ? '1 sugerencia' : `${count} sugerencias`;
}

// «Medicamento» of one item: free text, with suggestions from the medication
// catalog from five characters on, in a list that drops down from the field
// (#377). Law 25.649 asks to prescribe by active ingredient, so its help text
// says so.
export function MedicationField({ control, index }: MedicationFieldProps) {
    const { catalog, search, pick, onType } = useMedicationPick(control, index);
    const [open, setOpen] = useState(false);
    // The list drops down only with suggestions: an empty one would cover the
    // fields below while the professional writes free text.
    const shown = open && search.products.length > 0;
    const none = search.isSettled && search.products.length === 0;

    return (
        <FormField
            control={control}
            name={`items.${index}.medication`}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Medicamento</FormLabel>
                    <Combobox<MedicationProduct>
                        items={search.products}
                        filter={null}
                        // Free text: the field holds what was typed, never a
                        // selection the combobox would put back on blur.
                        value={null}
                        onValueChange={(product) => {
                            if (product !== null) {
                                pick(product);
                            }
                        }}
                        inputValue={field.value}
                        onInputValueChange={(text, details) => {
                            // Only typing: after a pick base-ui clears the
                            // input (`input-clear`) to the selection it
                            // doesn't hold, which would undo the pick.
                            if (details.reason === 'input-change') {
                                field.onChange(text);
                                onType();
                            }
                        }}
                        open={shown}
                        onOpenChange={setOpen}
                        itemToStringLabel={(product) => product.name}
                        isItemEqualToValue={(product, other) =>
                            product.gtin === other.gtin
                        }
                    >
                        <FormControl
                            render={
                                <ComboboxInput
                                    ref={field.ref}
                                    name={field.name}
                                    onBlur={field.onBlur}
                                    className="w-full"
                                    maxLength={255}
                                    showTrigger={false}
                                />
                            }
                        />
                        <ComboboxContent aria-label="Sugerencias de medicamentos">
                            {search.products.length > 0 && (
                                <p role="status" className="sr-only">
                                    {countStatus(search.products.length)}
                                </p>
                            )}
                            <ComboboxList>
                                {(product: MedicationProduct) => (
                                    <ComboboxItem
                                        key={product.gtin}
                                        value={product}
                                    >
                                        <MedicationSuggestion
                                            product={product}
                                        />
                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                    <FormDescription>
                        Elegí una sugerencia o escribí el principio activo (por
                        ejemplo, amoxicilina).
                    </FormDescription>
                    {catalog !== null && <PickedMedication catalog={catalog} />}
                    <FormMessage />
                    <p role="status" className="sr-only">
                        {search.isSearching
                            ? 'Buscando sugerencias…'
                            : none
                              ? 'Sin sugerencias: podés escribirlo a mano.'
                              : ''}
                    </p>
                </FormItem>
            )}
        />
    );
}
