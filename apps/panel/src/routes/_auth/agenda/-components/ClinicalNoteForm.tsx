import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

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
import { AmendmentReasonField } from '@/features/clinical-history/AmendmentReasonField';
import { DiagnosesField } from '@/features/clinical-history/DiagnosesField';
import {
    noteAmendmentSchema,
    type NoteAmendmentFormValues,
} from '@/lib/clinical-note-schema';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import type { Appointment } from '@/types/appointment';
import type { ClinicalNote } from '@/types/clinical-note';
import {
    useAmendClinicalNote,
    useCreateClinicalNote,
} from '../-hooks/use-clinical-notes';

type ClinicalNoteFormProps = {
    appointment: Appointment | null;
    open: boolean;
    amendingNote: ClinicalNote | null;
    onCancelAmendment: () => void;
    onSaved: () => void;
};

const EMPTY_VALUES: NoteAmendmentFormValues = {
    body: '',
    diagnoses: [],
    reason: '',
};

// Form for a single note: adds one when `amendingNote` is null, amends it
// otherwise (#323) — the reason only goes out with an amendment. An amendment
// starts from the current text and diagnoses (#324).
export function ClinicalNoteForm({
    appointment,
    open,
    amendingNote,
    onCancelAmendment,
    onSaved,
}: ClinicalNoteFormProps) {
    const create = useCreateClinicalNote(appointment);
    const amend = useAmendClinicalNote(appointment);

    const form = useForm<NoteAmendmentFormValues>({
        resolver: zodResolver(noteAmendmentSchema),
        defaultValues: EMPTY_VALUES,
    });

    // `form.reset()` notifies Controller children synchronously, so this must run in an effect, not during render.
    useEffect(() => {
        if (!open) {
            return;
        }

        form.reset(
            amendingNote
                ? {
                      body: amendingNote.body,
                      diagnoses: amendingNote.diagnoses,
                      reason: '',
                  }
                : EMPTY_VALUES,
        );
    }, [open, amendingNote, form]);

    async function onSubmit(values: NoteAmendmentFormValues) {
        const icd10CodeIds = values.diagnoses.map(
            (diagnosis) => diagnosis.icd10_code_id,
        );

        try {
            if (amendingNote) {
                await amend.mutateAsync({
                    id: amendingNote.id,
                    body: values.body,
                    icd10CodeIds,
                    reason: values.reason || null,
                });
            } else {
                await create.mutateAsync({ body: values.body, icd10CodeIds });
            }
            form.reset(EMPTY_VALUES);
            onSaved();
        } catch (error) {
            applyFormErrors(form, extractFormErrors(error), {});
        }
    }

    const isSaving =
        create.isPending || amend.isPending || form.formState.isSubmitting;

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
                    name="body"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel
                                className={amendingNote ? '' : 'sr-only'}
                            >
                                {amendingNote
                                    ? 'Texto corregido'
                                    : 'Nueva nota'}
                            </FormLabel>
                            <FormControl
                                render={
                                    <Textarea
                                        rows={4}
                                        maxLength={5000}
                                        {...field}
                                    />
                                }
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DiagnosesField control={form.control} name="diagnoses" />
                {amendingNote && (
                    <AmendmentReasonField
                        control={form.control}
                        name="reason"
                    />
                )}
                <DialogFooter>
                    {amendingNote && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                form.reset(EMPTY_VALUES);
                                onCancelAmendment();
                            }}
                        >
                            Cancelar enmienda
                        </Button>
                    )}
                    <Button type="submit" disabled={isSaving}>
                        {amendingNote ? 'Guardar enmienda' : 'Agregar nota'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
