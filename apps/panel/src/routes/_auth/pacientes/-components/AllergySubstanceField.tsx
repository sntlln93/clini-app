import { useState } from 'react';
import { useWatch, type Control } from 'react-hook-form';

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
import { useMedicationSubstanceSearch } from '@/features/prescriptions/use-medication-catalog';
import type { MedicalHistoryEntryFormValues } from '@/lib/medical-history-schema';

function countStatus(count: number): string {
    return count === 1 ? '1 sugerencia' : `${count} sugerencias`;
}

// «Sustancia» of an allergy (#383): free text, with the medication catalog's
// active substances suggested from five characters on, as «Medicamento» does
// in the medication form. A substance picked from them is written as the
// catalog names it, so the allergy warning finds it in a product picked from
// the catalog whatever its commercial name. It suggests only once the
// professional types, so an amendment's prefilled substance asks nothing.
export function AllergySubstanceField({
    control,
}: {
    control: Control<MedicalHistoryEntryFormValues>;
}) {
    const description = useWatch({ control, name: 'description' });
    const [typed, setTyped] = useState(false);
    const [open, setOpen] = useState(false);
    const { substances, isSearching, isSettled } = useMedicationSubstanceSearch(
        typed ? description : '',
    );
    // The list drops down only with suggestions: an empty one would cover the
    // fields below while the professional writes free text.
    const shown = open && substances.length > 0;
    const none = isSettled && substances.length === 0;

    return (
        <FormField
            control={control}
            name="description"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Sustancia</FormLabel>
                    <Combobox<string>
                        items={substances}
                        filter={null}
                        // Free text: the field holds what was typed, never a
                        // selection the combobox would put back on blur.
                        value={null}
                        onValueChange={(substance) => {
                            if (substance !== null) {
                                setTyped(false);
                                field.onChange(substance);
                            }
                        }}
                        inputValue={field.value}
                        onInputValueChange={(text, details) => {
                            // Only typing: after a pick base-ui clears the
                            // input (`input-clear`) to the selection it
                            // doesn't hold.
                            if (details.reason === 'input-change') {
                                setTyped(true);
                                field.onChange(text);
                            }
                        }}
                        open={shown}
                        onOpenChange={setOpen}
                    >
                        <FormControl
                            render={
                                <ComboboxInput
                                    ref={field.ref}
                                    name={field.name}
                                    onBlur={field.onBlur}
                                    className="w-full"
                                    maxLength={500}
                                    showTrigger={false}
                                />
                            }
                        />
                        <ComboboxContent aria-label="Sugerencias de sustancias">
                            {substances.length > 0 && (
                                <p role="status" className="sr-only">
                                    {countStatus(substances.length)}
                                </p>
                            )}
                            <ComboboxList>
                                {(substance: string) => (
                                    <ComboboxItem
                                        key={substance}
                                        value={substance}
                                    >
                                        {substance}
                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                    <FormDescription>
                        Elegí un principio activo de las sugerencias para que el
                        aviso lo reconozca en los medicamentos, o escribí la
                        sustancia (por ejemplo, látex).
                    </FormDescription>
                    <FormMessage />
                    <p role="status" className="sr-only">
                        {isSearching
                            ? 'Buscando sugerencias…'
                            : none
                              ? 'Sin sugerencias: podés escribirla a mano.'
                              : ''}
                    </p>
                </FormItem>
            )}
        />
    );
}
