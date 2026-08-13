import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { noteSchema, type NoteFormValues } from '@/lib/clinical-note-schema';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import { useCreatePatientClinicalNote } from '../-hooks/use-patient-clinical-notes';

type AddClinicalNoteFormProps = {
    patientId: number;
    appointmentId: number;
    onSaved: () => void;
};

const EMPTY_VALUES: NoteFormValues = { body: '' };

// Reuses the shared `noteSchema` validation (issue #217, also used by
// `agenda/-components/ClinicalNoteForm.tsx`): this is a create-only entry
// point (the patient page never edits/deletes notes), submitted against the
// acting membership's own appointment for today.
export function AddClinicalNoteForm({
    patientId,
    appointmentId,
    onSaved,
}: AddClinicalNoteFormProps) {
    const create = useCreatePatientClinicalNote(patientId, appointmentId);

    const form = useForm<NoteFormValues>({
        resolver: zodResolver(noteSchema),
        defaultValues: EMPTY_VALUES,
    });

    async function onSubmit(values: NoteFormValues) {
        try {
            await create.mutateAsync(values.body);
            form.reset(EMPTY_VALUES);
            onSaved();
        } catch (error) {
            applyFormErrors(form, extractFormErrors(error), {});
        }
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-3 rounded-lg border p-3"
            >
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
                            <FormControl
                                render={
                                    <Textarea
                                        rows={3}
                                        maxLength={5000}
                                        {...field}
                                    />
                                }
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button
                    type="submit"
                    size="sm"
                    disabled={create.isPending || form.formState.isSubmitting}
                >
                    Guardar nota
                </Button>
            </form>
        </Form>
    );
}
