import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, type RefObject } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import type { Prescription } from '@/types/prescription';
import {
    annulPrescriptionSchema,
    EMPTY_ANNUL_PRESCRIPTION,
    type AnnulPrescriptionFormOutput,
    type AnnulPrescriptionFormValues,
} from './annul-prescription-schema';
import { AnnulPrescriptionFields } from './AnnulPrescriptionFields';
import { useAnnulPrescription } from './use-prescriptions';

type AnnulPrescriptionDialogProps = {
    prescription: Prescription | null;
    onClose: () => void;
    onAnnulled: (prescription: Prescription) => void;
    finalFocus: RefObject<HTMLElement | null>;
};

// Opened by state, not by its trigger: annulled medication loses its actions,
// so a trigger inside them would unmount the dialog before it closes (#344),
// as with a note (#323).
export function AnnulPrescriptionDialog({
    prescription,
    onClose,
    onAnnulled,
    finalFocus,
}: AnnulPrescriptionDialogProps) {
    const open = prescription !== null;
    const annul = useAnnulPrescription(prescription?.appointment_id ?? null);
    const form = useForm<
        AnnulPrescriptionFormValues,
        unknown,
        AnnulPrescriptionFormOutput
    >({
        resolver: zodResolver(annulPrescriptionSchema),
        defaultValues: EMPTY_ANNUL_PRESCRIPTION,
    });

    // `form.reset()` notifies Controller children synchronously, so this must run in an effect, not during render.
    useEffect(() => {
        if (open) {
            form.reset(EMPTY_ANNUL_PRESCRIPTION);
        }
    }, [open, form]);

    async function submit({ kind, reason }: AnnulPrescriptionFormOutput) {
        if (prescription === null) {
            return;
        }

        try {
            await annul.mutateAsync({ id: prescription.id, kind, reason });
            onAnnulled(prescription);
            onClose();
        } catch (error) {
            applyFormErrors(form, extractFormErrors(error), {
                kind: 'kind',
                reason: 'reason',
            });
        }
    }

    const isSubmitting = form.formState.isSubmitting;

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent finalFocus={finalFocus}>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(submit)}
                        className="grid gap-4"
                    >
                        <DialogHeader>
                            <DialogTitle>Anular medicación</DialogTitle>
                            <DialogDescription>
                                La medicación queda en la historia clínica,
                                marcada como anulada junto con el motivo. No se
                                puede deshacer.
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
                        <AnnulPrescriptionFields control={form.control} />
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
                                variant="destructive"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && (
                                    <Spinner data-icon="inline-start" />
                                )}
                                Anular medicación
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
