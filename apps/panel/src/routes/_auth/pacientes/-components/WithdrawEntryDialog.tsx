import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, type RefObject } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { amendmentReason } from '@/lib/clinical-note-schema';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import type { MedicalHistoryEntry } from '@/types/medical-history';
import { useWithdrawMedicalHistoryEntry } from '../-hooks/use-patient-medical-history';

const schema = z.object({ reason: amendmentReason });

type WithdrawFormValues = z.infer<typeof schema>;

type WithdrawEntryDialogProps = {
    patientId: number;
    entry: MedicalHistoryEntry | null;
    onClose: () => void;
    finalFocus: RefObject<HTMLElement | null>;
};

// Marks an allergy or antecedent as no longer applying (#361). It isn't a
// mistake, so unlike an annulment the reason is optional.
export function WithdrawEntryDialog({
    patientId,
    entry,
    onClose,
    finalFocus,
}: WithdrawEntryDialogProps) {
    const withdraw = useWithdrawMedicalHistoryEntry(patientId);
    const form = useForm<WithdrawFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { reason: '' },
    });

    // `form.reset()` notifies Controller children synchronously, so this must run in an effect, not during render.
    useEffect(() => {
        if (entry !== null) {
            form.reset({ reason: '' });
        }
    }, [entry, form]);

    async function submit(values: WithdrawFormValues) {
        if (entry === null) {
            return;
        }

        try {
            await withdraw.mutateAsync({
                id: entry.id,
                reason: values.reason.trim() || null,
            });
            onClose();
        } catch (error) {
            applyFormErrors(form, extractFormErrors(error), {
                reason: 'reason',
            });
        }
    }

    return (
        <Dialog
            open={entry !== null}
            onOpenChange={(next) => !next && onClose()}
        >
            <DialogContent finalFocus={finalFocus}>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(submit)}
                        className="grid gap-4"
                    >
                        <DialogHeader>
                            <DialogTitle>Dar de baja</DialogTitle>
                            <DialogDescription>
                                {entry?.description} queda en la historia
                                clínica, marcado como ya no vigente.
                            </DialogDescription>
                        </DialogHeader>
                        {form.formState.errors.root && (
                            <p
                                role="alert"
                                className="text-sm text-destructive"
                            >
                                {form.formState.errors.root.message}
                            </p>
                        )}
                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Motivo (opcional)</FormLabel>
                                    <FormControl
                                        render={
                                            <Textarea
                                                maxLength={500}
                                                {...field}
                                            />
                                        }
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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
                                Dar de baja
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
