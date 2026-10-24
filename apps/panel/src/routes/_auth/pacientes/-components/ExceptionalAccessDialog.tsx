import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';
import { EXCEPTIONAL_ACCESS_MINUTES } from '@/lib/clinical-access';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import type { ExceptionalAccessPayload } from '../-hooks/use-clinical-history';
import {
    EMPTY_EXCEPTIONAL_ACCESS,
    exceptionalAccessSchema,
    type ExceptionalAccessFormOutput,
    type ExceptionalAccessFormValues,
} from './exceptional-access-schema';
import { ExceptionalAccessFields } from './ExceptionalAccessFields';

type ExceptionalAccessDialogProps = {
    trigger: ReactElement;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Rejects with the request error; 409/422 copy lands in the form. */
    onSubmit: (payload: ExceptionalAccessPayload) => Promise<unknown>;
};

/** Asks why a professional opens a patient's history without an appointment near today (#325). */
export function ExceptionalAccessDialog({
    trigger,
    open,
    onOpenChange,
    onSubmit,
}: ExceptionalAccessDialogProps) {
    const form = useForm<
        ExceptionalAccessFormValues,
        unknown,
        ExceptionalAccessFormOutput
    >({
        resolver: zodResolver(exceptionalAccessSchema),
        defaultValues: EMPTY_EXCEPTIONAL_ACCESS,
    });

    // `form.reset()` notifies Controller children synchronously, so this must run in an effect, not during render.
    useEffect(() => {
        if (open) {
            form.reset(EMPTY_EXCEPTIONAL_ACCESS);
        }
    }, [open, form]);

    async function submit(values: ExceptionalAccessFormOutput) {
        try {
            await onSubmit({
                reason: values.reason,
                reason_detail: values.reason_detail || null,
            });
            onOpenChange(false);
        } catch (error) {
            applyFormErrors(form, extractFormErrors(error), {
                reason: 'reason',
                reason_detail: 'reason_detail',
            });
        }
    }

    const isSubmitting = form.formState.isSubmitting;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger render={trigger} />
            <DialogContent>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(submit)}
                        className="grid gap-4"
                    >
                        <DialogHeader>
                            <DialogTitle>Motivo del acceso</DialogTitle>
                            <DialogDescription>
                                Queda en el registro de accesos del consultorio,
                                con tu nombre y la hora. La historia queda
                                abierta para vos durante{' '}
                                {EXCEPTIONAL_ACCESS_MINUTES} minutos.
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
                        <ExceptionalAccessFields control={form.control} />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && (
                                    <Spinner data-icon="inline-start" />
                                )}
                                Ver historia clínica
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
