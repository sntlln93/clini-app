import { toInstant } from '@/lib/datetime';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import type { AvailabilityException } from '@/types/availability';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
    readMergeProposal,
    type MergeProposal,
} from '../-components/availability-merge';
import {
    exceptionFormDefaults,
    exceptionFormSchema,
    exceptionRange,
    isOrgWideBlock,
    usesTimes,
    type ExceptionFormValues,
} from '../-components/exception-form';
import { useSaveAvailabilityException } from './use-availability-exceptions';

type PendingMerge = { proposal: MergeProposal; values: ExceptionFormValues };

/**
 * The exception form: its values, the instants it sends, and the merge
 * proposal the API answers when the range overlaps or touches another
 * exception of the same type (confirming re-sends it with `merge: true`).
 */
export function useExceptionForm(
    membershipId: number,
    exception: AvailabilityException | undefined,
    onDone: () => void,
) {
    const { mutateAsync, isPending } =
        useSaveAvailabilityException(membershipId);
    const form = useForm<ExceptionFormValues>({
        resolver: zodResolver(exceptionFormSchema),
        defaultValues: exceptionFormDefaults(exception),
    });
    const [pendingMerge, setPendingMerge] = useState<PendingMerge | null>(null);

    async function submit(values: ExceptionFormValues, merge: boolean) {
        const range = exceptionRange(values);
        if (!range) {
            return;
        }

        try {
            await mutateAsync({
                id: exception?.id,
                membershipId: isOrgWideBlock(values) ? null : membershipId,
                type: values.type,
                startAt: toInstant(range.start),
                endAt: toInstant(range.end),
                reason: values.reason.trim() || null,
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
                type: 'type',
                start_at: 'startDate',
                end_at: usesTimes(values) ? 'endTime' : 'endDate',
                reason: 'reason',
            });
        }
    }

    return {
        form,
        isPending: isPending || form.formState.isSubmitting,
        onSubmit: form.handleSubmit((values) => submit(values, false)),
        pendingMerge: pendingMerge?.proposal ?? null,
        confirmMerge: () =>
            pendingMerge && void submit(pendingMerge.values, true),
        cancelMerge: () => setPendingMerge(null),
    };
}
