import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, type ReactElement } from 'react';
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
    DialogTrigger,
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
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';

export const reasonSchema = z.object({
    reason: z
        .string()
        .trim()
        .min(3, 'Escribí un motivo de al menos 3 caracteres.')
        .max(500, 'El motivo no puede superar los 500 caracteres.'),
});

type ReasonFormValues = z.infer<typeof reasonSchema>;

const EMPTY_VALUES: ReasonFormValues = { reason: '' };

type ReasonDialogProps = {
    trigger: ReactElement;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    submitLabel: string;
    /** Rejects with the request error; 409/422 copy lands in the form. */
    onSubmit: (reason: string) => Promise<unknown>;
};

/** A destructive moderation action that requires a written "Motivo" (3..500 chars), stored in the audit trail. */
export function ReasonDialog({
    trigger,
    open,
    onOpenChange,
    title,
    description,
    submitLabel,
    onSubmit,
}: ReasonDialogProps) {
    const form = useForm<ReasonFormValues>({
        resolver: zodResolver(reasonSchema),
        defaultValues: EMPTY_VALUES,
    });

    // `form.reset()` notifies Controller children synchronously, so this must run in an effect, not during render.
    useEffect(() => {
        if (open) {
            form.reset(EMPTY_VALUES);
        }
    }, [open, form]);

    async function submit(values: ReasonFormValues) {
        try {
            await onSubmit(values.reason);
            onOpenChange(false);
        } catch (error) {
            applyFormErrors(form, extractFormErrors(error), {
                reason: 'reason',
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
                            <DialogTitle>{title}</DialogTitle>
                            <DialogDescription>{description}</DialogDescription>
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
                                    <FormLabel>Motivo</FormLabel>
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
                                onClick={() => onOpenChange(false)}
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
                                {submitLabel}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
