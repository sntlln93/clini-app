import { useWatch } from 'react-hook-form';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';
import type { AvailabilityException } from '@/types/availability';
import { useExceptionForm } from '../-hooks/use-exception-form';
import { mergeExceptionDescription } from './availability-merge';
import { AvailabilityExceptionFields } from './AvailabilityExceptionFields';
import { exceptionSummary } from './exception-summary';

type AvailabilityExceptionFormProps = {
    membershipId: number;
    canManageOrgWide: boolean;
    exception?: AvailabilityException;
    onDone: () => void;
};

export function AvailabilityExceptionForm({
    membershipId,
    canManageOrgWide,
    exception,
    onDone,
}: AvailabilityExceptionFormProps) {
    const {
        form,
        isPending,
        onSubmit,
        pendingMerge,
        confirmMerge,
        cancelMerge,
    } = useExceptionForm(membershipId, exception, onDone);
    // Subscribes to every field, so the summary follows what is typed.
    useWatch({ control: form.control });
    const summary = exceptionSummary(form.getValues());

    return (
        <Form {...form}>
            <form onSubmit={onSubmit} noValidate className="space-y-4">
                <AvailabilityExceptionFields
                    form={form}
                    canManageOrgWide={canManageOrgWide}
                    isEditing={exception !== undefined}
                />

                <div aria-live="polite">
                    {summary && (
                        <p className="rounded-2xl bg-muted/60 px-3 py-2 text-sm">
                            {summary}
                        </p>
                    )}
                </div>

                {form.formState.errors.root && (
                    <p role="alert" className="text-sm text-destructive">
                        {form.formState.errors.root.message}
                    </p>
                )}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={onDone}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Spinner data-icon="inline-start" />}
                        Guardar excepción
                    </Button>
                </div>
            </form>

            <ConfirmDialog
                open={pendingMerge !== null}
                onOpenChange={(open) => !open && cancelMerge()}
                title="Combinar excepciones"
                description={
                    pendingMerge ? mergeExceptionDescription(pendingMerge) : ''
                }
                confirmLabel="Combinar"
                cancelLabel="Cancelar"
                onConfirm={confirmMerge}
                isPending={isPending}
            />
        </Form>
    );
}
