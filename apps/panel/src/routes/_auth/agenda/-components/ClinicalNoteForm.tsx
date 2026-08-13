import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import type { ClinicalNote } from '@/types/clinical-note';
import {
    useCreateClinicalNote,
    useUpdateClinicalNote,
} from '../-hooks/use-clinical-notes';

type ClinicalNoteFormProps = {
    appointmentId: number | null;
    open: boolean;
    editingNote: ClinicalNote | null;
    onCancelEdit: () => void;
    onSaved: () => void;
};

const noteSchema = z.object({
    body: z
        .string()
        .trim()
        .min(1, 'La nota no puede estar vacía.')
        .max(5000, 'La nota no puede superar los 5000 caracteres.'),
});

type NoteFormValues = z.infer<typeof noteSchema>;

const EMPTY_VALUES: NoteFormValues = { body: '' };

// Add/edit form for a single note: create when `editingNote` is null, update otherwise.
export function ClinicalNoteForm({
    appointmentId,
    open,
    editingNote,
    onCancelEdit,
    onSaved,
}: ClinicalNoteFormProps) {
    const create = useCreateClinicalNote(appointmentId);
    const update = useUpdateClinicalNote(appointmentId);

    const form = useForm<NoteFormValues>({
        resolver: zodResolver(noteSchema),
        defaultValues: EMPTY_VALUES,
    });

    // `form.reset()` notifies Controller children synchronously, so this must run in an effect, not during render.
    useEffect(() => {
        if (!open) {
            return;
        }

        form.reset(editingNote ? { body: editingNote.body } : EMPTY_VALUES);
    }, [open, editingNote, form]);

    async function onSubmit(values: NoteFormValues) {
        try {
            if (editingNote) {
                await update.mutateAsync({
                    id: editingNote.id,
                    body: values.body,
                });
            } else {
                await create.mutateAsync(values.body);
            }
            form.reset(EMPTY_VALUES);
            onSaved();
        } catch (error) {
            applyFormErrors(form, extractFormErrors(error), {});
        }
    }

    const isSaving =
        create.isPending || update.isPending || form.formState.isSubmitting;

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
                <DialogFooter>
                    {editingNote && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                form.reset(EMPTY_VALUES);
                                onCancelEdit();
                            }}
                        >
                            Cancelar edición
                        </Button>
                    )}
                    <Button type="submit" disabled={isSaving}>
                        {editingNote ? 'Guardar cambios' : 'Agregar nota'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
