import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import {
    EMPTY_ITEM,
    EMPTY_PRESCRIPTION,
    isPrescriptionFieldKey,
    PRESCRIPTION_MAX_ITEMS,
    prescriptionSchema,
    toFormValues,
    toPayload,
    type PrescriptionFormValues,
} from '@/lib/prescription-schema';
import type { Prescription } from '@/types/prescription';
import { useSavePrescription } from '../-hooks/use-prescriptions';
import { PrescriptionItemFields } from './PrescriptionItemFields';

type PrescriptionFormProps = {
    appointmentId: number | null;
    open: boolean;
    editing: Prescription | null;
    onCancelEdit: () => void;
    onSaved: () => void;
};

// Issue/edit form for one prescription: issues when `editing` is null, updates otherwise.
export function PrescriptionForm({
    appointmentId,
    open,
    editing,
    onCancelEdit,
    onSaved,
}: PrescriptionFormProps) {
    const save = useSavePrescription(appointmentId);
    const form = useForm<PrescriptionFormValues>({
        resolver: zodResolver(prescriptionSchema),
        defaultValues: EMPTY_PRESCRIPTION,
    });
    const items = useFieldArray({ control: form.control, name: 'items' });

    // `form.reset()` notifies Controller children synchronously, so this must run in an effect, not during render.
    useEffect(() => {
        if (open) {
            form.reset(editing ? toFormValues(editing) : EMPTY_PRESCRIPTION);
        }
    }, [open, editing, form]);

    async function onSubmit(values: PrescriptionFormValues) {
        try {
            await save.mutateAsync({
                prescriptionId: editing?.id ?? null,
                payload: toPayload(values),
            });
            form.reset(EMPTY_PRESCRIPTION);
            onSaved();
        } catch (error) {
            const formErrors = extractFormErrors(error);
            const fieldMap = Object.fromEntries(
                Object.keys(formErrors.errors)
                    .filter(isPrescriptionFieldKey)
                    .map((key) => [key, key]),
            );
            applyFormErrors(form, formErrors, fieldMap);
        }
    }

    const itemsError = form.formState.errors.items?.root?.message;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                {form.formState.errors.root && (
                    <p className="text-sm text-destructive">
                        {form.formState.errors.root.message}
                    </p>
                )}
                <FormField
                    control={form.control}
                    name="diagnosis"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Diagnóstico (opcional)</FormLabel>
                            <FormControl
                                render={
                                    <Textarea
                                        rows={2}
                                        maxLength={2000}
                                        {...field}
                                    />
                                }
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {items.fields.map((item, index) => (
                    <PrescriptionItemFields
                        key={item.id}
                        control={form.control}
                        index={index}
                        canRemove={items.fields.length > 1}
                        onRemove={() => items.remove(index)}
                    />
                ))}
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
                <DialogFooter>
                    {editing && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancelEdit}
                        >
                            Cancelar edición
                        </Button>
                    )}
                    <Button
                        type="submit"
                        disabled={save.isPending || form.formState.isSubmitting}
                    >
                        {editing ? 'Guardar cambios' : 'Emitir receta'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
