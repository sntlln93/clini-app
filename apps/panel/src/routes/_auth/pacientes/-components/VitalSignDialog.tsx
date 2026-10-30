import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { AmendmentReasonField } from '@/features/clinical-history/AmendmentReasonField';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import {
    EMPTY_VITAL_SIGN,
    hasNoValues,
    isVitalSignFieldKey,
    NO_VALUES_MESSAGE,
    toFormValues,
    toPayload,
    vitalSignSchema,
    type VitalSignFormValues,
} from '@/lib/vital-sign-schema';
import { VITAL_SIGN_FIELDS, VITAL_SIGN_INPUT_KEYS } from '@/lib/vital-signs';
import type { VitalSign } from '@/types/vital-sign';
import { useSaveVitalSign } from '../-hooks/use-patient-vital-signs';

type VitalSignDialogProps = {
    patientId: number;
    // The appointment a new measurement goes on, or the one being amended.
    target: { appointmentId: number; amending: VitalSign | null } | null;
    onClose: () => void;
};

// Records a measurement, every value optional (#361), or amends one: the
// amendment corrects the same point of the series and may say why.
export function VitalSignDialog({
    patientId,
    target,
    onClose,
}: VitalSignDialogProps) {
    const save = useSaveVitalSign(patientId);
    const amending = target?.amending ?? null;
    const form = useForm<VitalSignFormValues>({
        resolver: zodResolver(vitalSignSchema),
        defaultValues: EMPTY_VITAL_SIGN,
    });

    // `form.reset()` notifies Controller children synchronously, so this must run in an effect, not during render.
    useEffect(() => {
        if (target !== null) {
            form.reset(amending ? toFormValues(amending) : EMPTY_VITAL_SIGN);
        }
    }, [target, amending, form]);

    async function submit(values: VitalSignFormValues) {
        if (target === null) {
            return;
        }

        if (hasNoValues(values)) {
            form.setError('root', { message: NO_VALUES_MESSAGE });

            return;
        }

        try {
            await save.mutateAsync({
                appointmentId: target.appointmentId,
                vitalSignId: amending?.id ?? null,
                payload: toPayload(values),
            });
            onClose();
        } catch (error) {
            const formErrors = extractFormErrors(error);
            applyFormErrors(
                form,
                formErrors,
                Object.fromEntries(
                    Object.keys(formErrors.errors)
                        .filter(isVitalSignFieldKey)
                        .map((key) => [key, key]),
                ),
            );
        }
    }

    const rootError = form.formState.errors.root?.message;

    return (
        <Dialog
            open={target !== null}
            onOpenChange={(next) => !next && onClose()}
        >
            <DialogContent className="sm:max-w-2xl">
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(submit)}
                        className="grid gap-4"
                    >
                        <DialogHeader>
                            <DialogTitle>
                                {amending
                                    ? 'Enmendar medición'
                                    : 'Registrar medición'}
                            </DialogTitle>
                            <DialogDescription>
                                Cargá los datos que tomaste; los demás quedan
                                vacíos. El IMC se calcula con el peso y la
                                altura.
                            </DialogDescription>
                        </DialogHeader>
                        {rootError && (
                            <p
                                role="alert"
                                className="text-sm text-destructive"
                            >
                                {rootError}
                            </p>
                        )}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {VITAL_SIGN_INPUT_KEYS.map((key) => (
                                <FormField
                                    key={key}
                                    control={form.control}
                                    name={key}
                                    render={({ field }) => (
                                        <FormItem className="min-w-0">
                                            <FormLabel>
                                                {VITAL_SIGN_FIELDS[key].label} (
                                                {VITAL_SIGN_FIELDS[key].unit})
                                            </FormLabel>
                                            <FormControl
                                                render={
                                                    <Input
                                                        inputMode="decimal"
                                                        autoComplete="off"
                                                        {...field}
                                                    />
                                                }
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
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
                                {amending
                                    ? 'Guardar enmienda'
                                    : 'Registrar medición'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
