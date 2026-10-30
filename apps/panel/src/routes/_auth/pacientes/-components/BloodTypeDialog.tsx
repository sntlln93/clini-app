import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
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
import { Form } from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';
import { AmendmentReasonField } from '@/features/clinical-history/AmendmentReasonField';
import { amendmentReason } from '@/lib/clinical-note-schema';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import { BLOOD_TYPES, type BloodType } from '@/types/medical-history';
import { useRecordBloodType } from '../-hooks/use-patient-medical-history';
import { OptionSelectField } from './OptionSelectField';

const schema = z.object({
    // A string while none is chosen, so the field stays controlled.
    blood_type: z
        .string()
        .refine((value) => (BLOOD_TYPES as readonly string[]).includes(value), {
            message: 'Elegí el grupo sanguíneo.',
        }),
    reason: amendmentReason,
});

type BloodTypeFormValues = z.infer<typeof schema>;

const ITEMS = BLOOD_TYPES.map((type) => ({ value: type, label: type }));

type BloodTypeDialogProps = {
    patientId: number;
    // The appointment it is recorded on, and whether one is recorded already.
    target: { appointmentId: number; current: BloodType | null } | null;
    onClose: () => void;
};

// Records the blood type, or changes it (#361, ADR 0027): the new one becomes
// the current and the earlier stay in the history, so a change may say why.
export function BloodTypeDialog({
    patientId,
    target,
    onClose,
}: BloodTypeDialogProps) {
    const record = useRecordBloodType(patientId);
    const form = useForm<BloodTypeFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { blood_type: '', reason: '' },
    });
    const changing = target?.current != null;

    // `form.reset()` notifies Controller children synchronously, so this must run in an effect, not during render.
    useEffect(() => {
        if (target !== null) {
            form.reset({ blood_type: '', reason: '' });
        }
    }, [target, form]);

    async function submit(values: BloodTypeFormValues) {
        if (target === null) {
            return;
        }

        try {
            await record.mutateAsync({
                appointmentId: target.appointmentId,
                bloodType: values.blood_type as BloodType,
                reason: values.reason.trim() || null,
            });
            onClose();
        } catch (error) {
            applyFormErrors(form, extractFormErrors(error), {
                blood_type: 'blood_type',
                reason: 'reason',
            });
        }
    }

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
                                {changing
                                    ? 'Cambiar grupo sanguíneo'
                                    : 'Registrar grupo sanguíneo'}
                            </DialogTitle>
                            <DialogDescription>
                                {changing
                                    ? `El grupo actual (${target?.current}) queda en la historia clínica.`
                                    : 'Queda en la historia clínica con tu nombre.'}
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
                        <OptionSelectField
                            control={form.control}
                            name="blood_type"
                            label="Grupo y factor"
                            placeholder="Elegí uno"
                            items={ITEMS}
                        />
                        {changing && (
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
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
