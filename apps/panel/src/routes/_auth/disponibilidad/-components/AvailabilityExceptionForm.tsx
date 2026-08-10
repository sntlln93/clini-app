import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import type { AvailabilityException } from '@/types/availability';
import { useSaveAvailabilityException } from '../-hooks/use-availability-exceptions';
import {
    mergeExceptionDescription,
    readMergeProposal,
    type MergeProposal,
} from './availability-merge';
import {
    availabilityExceptionSchema,
    type AvailabilityExceptionFormValues,
} from './availability-schemas';
import { AvailabilityExceptionFields } from './AvailabilityExceptionFields';

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
    const { mutateAsync, isPending } =
        useSaveAvailabilityException(membershipId);

    const form = useForm<AvailabilityExceptionFormValues>({
        resolver: zodResolver(availabilityExceptionSchema),
        defaultValues: {
            type: exception?.type ?? 'blocked',
            startAt: exception?.start_at ?? '',
            endAt: exception?.end_at ?? '',
            reason: exception?.reason ?? '',
            isOrgWide: exception ? exception.membership_id === null : false,
        },
    });

    const [pendingMerge, setPendingMerge] = useState<{
        proposal: MergeProposal;
        values: AvailabilityExceptionFormValues;
    } | null>(null);

    async function submit(
        values: AvailabilityExceptionFormValues,
        merge: boolean,
    ) {
        try {
            await mutateAsync({
                id: exception?.id,
                membershipId: values.isOrgWide ? null : membershipId,
                type: values.type,
                startAt: values.startAt,
                endAt: values.endAt,
                reason: values.reason || null,
                merge,
            });
            setPendingMerge(null);
            onDone();
        } catch (error) {
            if (!merge) {
                const proposal = readMergeProposal(
                    error,
                    'availability.exception_merge_required',
                );
                if (proposal) {
                    setPendingMerge({ proposal, values });
                    return;
                }
            }
            setPendingMerge(null);
            applyFormErrors(form, extractFormErrors(error), {
                start_at: 'startAt',
                end_at: 'endAt',
            });
        }
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit((values) => submit(values, false))}
                className="space-y-2 rounded-md border p-3"
            >
                <AvailabilityExceptionFields
                    control={form.control}
                    canManageOrgWide={canManageOrgWide}
                />

                {form.formState.errors.root && (
                    <p className="text-sm text-destructive">
                        {form.formState.errors.root.message}
                    </p>
                )}

                <div className="flex gap-2">
                    <Button
                        type="submit"
                        size="sm"
                        disabled={isPending || form.formState.isSubmitting}
                    >
                        Guardar
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={onDone}
                    >
                        Cancelar
                    </Button>
                </div>
            </form>

            <ConfirmDialog
                open={pendingMerge !== null}
                onOpenChange={(open) => !open && setPendingMerge(null)}
                title="Combinar excepciones"
                description={
                    pendingMerge
                        ? mergeExceptionDescription(pendingMerge.proposal)
                        : ''
                }
                confirmLabel="Combinar"
                cancelLabel="Cancelar"
                onConfirm={() =>
                    pendingMerge && void submit(pendingMerge.values, true)
                }
                isPending={isPending}
            />
        </Form>
    );
}
