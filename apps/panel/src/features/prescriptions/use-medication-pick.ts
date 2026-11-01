import { useState } from 'react';
import { useFormContext, useWatch, type Control } from 'react-hook-form';

import type { PrescriptionFormValues } from '@/lib/prescription-schema';
import type { MedicationProduct } from '@/types/medication';
import { useMedicationSearch } from './use-medication-catalog';

// «Medicamento» of one item (#377): it suggests catalog products only once the
// professional types in it, so an amendment's prefilled name asks nothing.
// Picking one fills the name and the presentation and links the item to the
// product; typing again unlinks it, and the item stays free text.
export function useMedicationPick(
    control: Control<PrescriptionFormValues>,
    index: number,
) {
    const { setValue, setFocus } = useFormContext<PrescriptionFormValues>();
    const medication = useWatch({ control, name: `items.${index}.medication` });
    const catalog = useWatch({ control, name: `items.${index}.catalog` });
    const [typed, setTyped] = useState(false);
    const search = useMedicationSearch(
        typed && catalog === null ? medication : '',
    );

    function pick(product: MedicationProduct) {
        const options = { shouldDirty: true, shouldValidate: true };
        setValue(`items.${index}.medication`, product.name, options);
        setValue(
            `items.${index}.presentation`,
            product.presentation ?? '',
            options,
        );
        setValue(
            `items.${index}.catalog`,
            {
                gtin: product.gtin,
                substances: product.substances,
                dispensing_condition: product.dispensing_condition,
                control_mark: product.control_mark,
                composition_incomplete: product.composition_incomplete,
            },
            options,
        );
        setTyped(false);
        // The suggestion that had the focus goes away with the list.
        setFocus(`items.${index}.medication`);
    }

    function onType() {
        setTyped(true);
        if (catalog !== null) {
            setValue(`items.${index}.catalog`, null, { shouldDirty: true });
        }
    }

    return { catalog, search, pick, onType };
}
