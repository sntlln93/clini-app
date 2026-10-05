import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';

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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import { formatDateTime } from '@/lib/format';
import type { AdminSubscription } from '@/types/subscription';
import { CalendarPlus } from 'lucide-react';
import { useExtendGrace } from '../-hooks/use-extend-grace';
import {
    graceDateBounds,
    graceExtensionSchema,
    type GraceExtensionValues,
} from './grace-schema';

const EMPTY_VALUES: GraceExtensionValues = { grace_ends_on: '', note: '' };

/** Built per validation, so the window is "today" at submit time — the same one the API checks. */
const validateAgainstToday: Resolver<GraceExtensionValues> = (
    values,
    context,
    options,
) => zodResolver(graceExtensionSchema())(values, context, options);

/** "Extender gracia": only offered for a subscription in grace or expired (the only states the API accepts). */
export function ExtendGraceDialog({
    subscription,
}: {
    subscription: AdminSubscription;
}) {
    const [open, setOpen] = useState(false);
    // Bounds follow "today" at the moment the dialog opens, not at page mount: a page left open past midnight
    // would otherwise still offer the old "mañana".
    const [openedAt, setOpenedAt] = useState(() => new Date());
    const bounds = useMemo(() => graceDateBounds(openedAt), [openedAt]);
    const form = useForm<GraceExtensionValues>({
        resolver: validateAgainstToday,
        defaultValues: EMPTY_VALUES,
    });
    const { mutateAsync } = useExtendGrace(subscription.id);

    // `form.reset()` notifies Controller children synchronously, so this must run in an effect, not during render.
    useEffect(() => {
        if (open) {
            form.reset(EMPTY_VALUES);
        }
    }, [open, form]);

    async function submit(values: GraceExtensionValues) {
        const note = values.note.trim();
        try {
            await mutateAsync({
                grace_ends_on: values.grace_ends_on,
                note: note === '' ? null : note,
            });
            setOpen(false);
        } catch (error) {
            applyFormErrors(
                form,
                extractFormErrors(error, {
                    'subscriptions.grace_extension_not_later': 'grace_ends_on',
                }),
                { grace_ends_on: 'grace_ends_on', note: 'note' },
            );
        }
    }

    const isSubmitting = form.formState.isSubmitting;
    const currentEnd =
        subscription.status === 'grace'
            ? `La gracia actual termina el ${formatDateTime(subscription.grace_ends_at)}.`
            : 'La suscripción está vencida: vuelve a quedar en gracia hasta la fecha elegida.';

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (next) {
                    setOpenedAt(new Date());
                }
                setOpen(next);
            }}
        >
            <DialogTrigger
                render={
                    <Button>
                        <CalendarPlus data-icon="inline-start" />
                        Extender gracia
                    </Button>
                }
            />
            <DialogContent>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(submit)}
                        className="grid gap-4"
                    >
                        <DialogHeader>
                            <DialogTitle>
                                Extender período de gracia
                            </DialogTitle>
                            <DialogDescription>{currentEnd}</DialogDescription>
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
                            name="grace_ends_on"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nueva fecha de fin</FormLabel>
                                    <FormControl
                                        render={
                                            <Input
                                                type="date"
                                                min={bounds.min}
                                                max={bounds.max}
                                                {...field}
                                            />
                                        }
                                    />
                                    <FormDescription>
                                        Hasta las 23:59 de ese día (hora de
                                        Buenos Aires).
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nota</FormLabel>
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
                                onClick={() => setOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && (
                                    <Spinner data-icon="inline-start" />
                                )}
                                Extender
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
