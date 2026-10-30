import { useState } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';

import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import {
    EMPTY_PRESCRIPTION,
    isPrescriptionFieldKey,
    toPayload,
    type PrescriptionFormValues,
} from '@/lib/prescription-schema';
import type { Prescription } from '@/types/prescription';
import {
    readAllergyWarning,
    warnedAllergyIds,
    type AllergyWarning,
} from './allergy-warning';
import { useSavePrescription } from './use-prescriptions';

type PendingWarning = {
    warning: AllergyWarning;
    // The items it warned about: editing them drops the warning, since the
    // confirmation was about those.
    items: string;
};

// Saves the form and, when the medication matches current allergies of the
// patient (#362), keeps the warning until «Indicar igual» sends it again with
// those allergies confirmed, or the professional changes the medication.
export function usePrescriptionSubmit({
    form,
    appointmentId,
    amending,
    onSaved,
}: {
    form: UseFormReturn<PrescriptionFormValues>;
    appointmentId: number | null;
    amending: Prescription | null;
    onSaved: () => void;
}) {
    const save = useSavePrescription(appointmentId);
    const items = useWatch({ control: form.control, name: 'items' });
    const [pending, setPending] = useState<PendingWarning | null>(null);

    // Adjust state during render (not a useEffect, per react-hooks/set-state-in-effect): another record to amend drops the warning.
    const [amendingSeen, setAmendingSeen] = useState(amending);
    if (amending !== amendingSeen) {
        setAmendingSeen(amending);
        setPending(null);
    }

    async function submit(
        values: PrescriptionFormValues,
        confirmedAllergyIds: number[] = [],
    ) {
        try {
            await save.mutateAsync({
                prescriptionId: amending?.id ?? null,
                payload: toPayload(values),
                confirmedAllergyIds,
            });
            setPending(null);
            form.reset(EMPTY_PRESCRIPTION);
            onSaved();
        } catch (error) {
            const warning = readAllergyWarning(error);

            if (warning) {
                setPending({
                    warning,
                    items: JSON.stringify(form.getValues('items')),
                });
                return;
            }

            const formErrors = extractFormErrors(error);
            const fieldMap = Object.fromEntries(
                Object.keys(formErrors.errors)
                    .filter(isPrescriptionFieldKey)
                    .map((key) => [key, key]),
            );
            applyFormErrors(form, formErrors, fieldMap);
        }
    }

    const warning =
        pending !== null && pending.items === JSON.stringify(items)
            ? pending.warning
            : null;

    return {
        isPending: save.isPending,
        warning,
        onSubmit: form.handleSubmit((values) => submit(values)),
        onConfirm: form.handleSubmit((values) =>
            submit(values, warning ? warnedAllergyIds(warning) : []),
        ),
        onDismiss: () => setPending(null),
    };
}
