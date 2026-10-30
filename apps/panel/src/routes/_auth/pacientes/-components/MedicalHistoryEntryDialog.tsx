import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';
import { AmendmentReasonField } from '@/features/clinical-history/AmendmentReasonField';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import { CATEGORY_LABELS } from '@/lib/medical-history';
import {
    emptyEntry,
    isMedicalHistoryFieldKey,
    medicalHistoryEntrySchema,
    toEntryFormValues,
    toEntryPayload,
    type MedicalHistoryEntryFormValues,
} from '@/lib/medical-history-schema';
import type {
    MedicalHistoryCategory,
    MedicalHistoryEntry,
} from '@/types/medical-history';
import { useSaveMedicalHistoryEntry } from '../-hooks/use-patient-medical-history';
import { MedicalHistoryEntryFields } from './MedicalHistoryEntryFields';

export type MedicalHistoryEntryTarget = {
    appointmentId: number;
    category: MedicalHistoryCategory;
    amending: MedicalHistoryEntry | null;
};

type MedicalHistoryEntryDialogProps = {
    patientId: number;
    target: MedicalHistoryEntryTarget | null;
    onClose: () => void;
};

// Records an allergy or an antecedent of the category it was opened for
// (#361), or amends one: a new version, the category stays.
export function MedicalHistoryEntryDialog({
    patientId,
    target,
    onClose,
}: MedicalHistoryEntryDialogProps) {
    const save = useSaveMedicalHistoryEntry(patientId);
    const form = useForm<MedicalHistoryEntryFormValues>({
        resolver: zodResolver(medicalHistoryEntrySchema),
        defaultValues: emptyEntry('allergy'),
    });
    const amending = target?.amending ?? null;

    // `form.reset()` notifies Controller children synchronously, so this must run in an effect, not during render.
    useEffect(() => {
        if (target !== null) {
            form.reset(
                target.amending
                    ? toEntryFormValues(target.amending)
                    : emptyEntry(target.category),
            );
        }
    }, [target, form]);

    async function submit(values: MedicalHistoryEntryFormValues) {
        if (target === null) {
            return;
        }

        try {
            await save.mutateAsync({
                appointmentId: target.appointmentId,
                entryId: amending?.id ?? null,
                payload: toEntryPayload(values),
            });
            onClose();
        } catch (error) {
            const formErrors = extractFormErrors(error);
            applyFormErrors(
                form,
                formErrors,
                Object.fromEntries(
                    Object.keys(formErrors.errors)
                        .filter(isMedicalHistoryFieldKey)
                        .map((key) => [key, key]),
                ),
            );
        }
    }

    const label = target ? CATEGORY_LABELS[target.category].toLowerCase() : '';

    return (
        <Dialog
            open={target !== null}
            onOpenChange={(next) => !next && onClose()}
        >
            <DialogContent>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(submit)}
                        className="grid gap-4"
                    >
                        <DialogHeader>
                            <DialogTitle>
                                {amending
                                    ? `Enmendar ${label}`
                                    : `Registrar ${label}`}
                            </DialogTitle>
                        </DialogHeader>
                        {form.formState.errors.root && (
                            <p
                                role="alert"
                                className="text-sm text-destructive"
                            >
                                {form.formState.errors.root.message}
                            </p>
                        )}
                        {target && (
                            <MedicalHistoryEntryFields
                                control={form.control}
                                category={target.category}
                            />
                        )}
                        {amending && (
                            <AmendmentReasonField
                                control={form.control}
                                name="reason"
                            />
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting && (
                                    <Spinner data-icon="inline-start" />
                                )}
                                {amending ? 'Guardar enmienda' : 'Registrar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
