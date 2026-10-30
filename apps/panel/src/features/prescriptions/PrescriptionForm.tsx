import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { AmendmentReasonField } from '@/features/clinical-history/AmendmentReasonField';
import {
    EMPTY_ITEM,
    EMPTY_PRESCRIPTION,
    PRESCRIPTION_MAX_ITEMS,
    prescriptionSchema,
    toFormValues,
    type PrescriptionFormValues,
} from '@/lib/prescription-schema';
import type { Prescription } from '@/types/prescription';
import { AllergyWarningAlert } from './AllergyWarningAlert';
import { CurrentAllergies } from './CurrentAllergies';
import { PrescriptionItemFields } from './PrescriptionItemFields';
import { usePrescriptionSubmit } from './use-prescription-submit';

type PrescriptionFormProps = {
    appointmentId: number | null;
    open: boolean;
    amending: Prescription | null;
    onCancelAmendment: () => void;
    onSaved: () => void;
};

// Form for one indicated-medication record: records one when `amending` is
// null, amends it otherwise (#323) — the reason only goes out with an amendment.
// The patient's current allergies come first, and medication that matches one
// is saved only once the warning is confirmed (#362).
export function PrescriptionForm({
    appointmentId,
    open,
    amending,
    onCancelAmendment,
    onSaved,
}: PrescriptionFormProps) {
    const form = useForm<PrescriptionFormValues>({
        resolver: zodResolver(prescriptionSchema),
        defaultValues: EMPTY_PRESCRIPTION,
    });
    const items = useFieldArray({ control: form.control, name: 'items' });

    // `form.reset()` notifies Controller children synchronously, so this must run in an effect, not during render.
    useEffect(() => {
        if (open) {
            form.reset(amending ? toFormValues(amending) : EMPTY_PRESCRIPTION);
        }
    }, [open, amending, form]);

    const submit = usePrescriptionSubmit({
        form,
        appointmentId,
        amending,
        onSaved,
    });

    const itemsError = form.formState.errors.items?.root?.message;

    return (
        <Form {...form}>
            <form onSubmit={submit.onSubmit} className="space-y-3">
                <CurrentAllergies appointmentId={appointmentId} />
                {form.formState.errors.root && (
                    <p className="text-sm text-destructive">
                        {form.formState.errors.root.message}
                    </p>
                )}
                {items.fields.map((item, index) => (
                    <PrescriptionItemFields
                        key={item.id}
                        control={form.control}
                        index={index}
                        canRemove={items.fields.length > 1}
                        onRemove={() => items.remove(index)}
                    />
                ))}
                {amending && (
                    <AmendmentReasonField
                        control={form.control}
                        name="reason"
                    />
                )}
                {itemsError && (
                    <p className="text-sm text-destructive">{itemsError}</p>
                )}
                {items.fields.length < PRESCRIPTION_MAX_ITEMS && (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => items.append(EMPTY_ITEM)}
                    >
                        Agregar medicamento
                    </Button>
                )}
                {submit.warning && (
                    <AllergyWarningAlert
                        warning={submit.warning}
                        isPending={submit.isPending}
                        onConfirm={submit.onConfirm}
                        onDismiss={submit.onDismiss}
                    />
                )}
                <DialogFooter>
                    {amending && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancelAmendment}
                        >
                            Cancelar enmienda
                        </Button>
                    )}
                    <Button
                        type="submit"
                        disabled={
                            submit.isPending || form.formState.isSubmitting
                        }
                    >
                        {amending ? 'Guardar enmienda' : 'Registrar medicación'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
