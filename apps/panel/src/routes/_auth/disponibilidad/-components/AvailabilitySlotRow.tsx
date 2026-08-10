import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import type { Availability } from '@/types/availability';
import {
    useDeleteAvailability,
    useSaveAvailability,
} from '../-hooks/use-availabilities';
import {
    mergeSlotDescription,
    readMergeProposal,
    type MergeProposal,
} from './availability-merge';
import {
    availabilitySlotSchema,
    type AvailabilitySlotFormValues,
} from './availability-schemas';
import { AvailabilitySlotFields } from './AvailabilitySlotFields';

type AvailabilitySlotRowProps = {
    membershipId: number;
    dayOfWeek: number;
    slot: Availability | null;
    canManage: boolean;
    onSaved?: () => void;
    onCancel?: () => void;
};

const DEFAULT_VALUES: AvailabilitySlotFormValues = {
    startTime: '09:00',
    endTime: '10:00',
};

export function AvailabilitySlotRow({
    membershipId,
    dayOfWeek,
    slot,
    canManage,
    onSaved,
    onCancel,
}: AvailabilitySlotRowProps) {
    const form = useForm<AvailabilitySlotFormValues>({
        resolver: zodResolver(availabilitySlotSchema),
        defaultValues: slot
            ? { startTime: slot.start_time, endTime: slot.end_time }
            : DEFAULT_VALUES,
    });

    // Effect (not render) because `form.reset()` notifies Controller-subscribed children synchronously.
    useEffect(() => {
        if (slot) {
            form.reset({
                startTime: slot.start_time,
                endTime: slot.end_time,
            });
        }
    }, [slot, form]);

    const save = useSaveAvailability(membershipId);
    const remove = useDeleteAvailability(membershipId);
    const [pendingMerge, setPendingMerge] = useState<{
        proposal: MergeProposal;
        values: AvailabilitySlotFormValues;
    } | null>(null);

    async function submit(values: AvailabilitySlotFormValues, merge: boolean) {
        try {
            await save.mutateAsync({
                id: slot?.id,
                dayOfWeek,
                startTime: values.startTime,
                endTime: values.endTime,
                merge,
            });
            setPendingMerge(null);
            onSaved?.();
        } catch (error) {
            if (!merge) {
                const proposal = readMergeProposal(
                    error,
                    'availability.slot_merge_required',
                );
                if (proposal) {
                    setPendingMerge({ proposal, values });
                    return;
                }
            }
            setPendingMerge(null);
            applyFormErrors(form, extractFormErrors(error), {
                start_time: 'startTime',
                end_time: 'endTime',
            });
        }
    }

    function handleDelete() {
        if (slot) {
            remove.mutate(slot.id);
        }
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit((values) => submit(values, false))}
                className="flex flex-wrap items-end gap-2"
            >
                <AvailabilitySlotFields
                    control={form.control}
                    canManage={canManage}
                />

                {canManage && (
                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            size="sm"
                            disabled={
                                save.isPending || form.formState.isSubmitting
                            }
                        >
                            Guardar
                        </Button>
                        {slot ? (
                            <ConfirmDialog
                                trigger={
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={remove.isPending}
                                    >
                                        Eliminar
                                    </Button>
                                }
                                title="Eliminar horario"
                                description="Se quita este horario de la agenda semanal del profesional. Los turnos ya agendados no se modifican."
                                onConfirm={handleDelete}
                                isPending={remove.isPending}
                            />
                        ) : (
                            onCancel && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={onCancel}
                                >
                                    Cancelar
                                </Button>
                            )
                        )}
                    </div>
                )}

                {form.formState.errors.root && (
                    <p className="w-full text-sm text-destructive">
                        {form.formState.errors.root.message}
                    </p>
                )}
            </form>

            <ConfirmDialog
                open={pendingMerge !== null}
                onOpenChange={(open) => !open && setPendingMerge(null)}
                title="Combinar horarios"
                description={
                    pendingMerge
                        ? mergeSlotDescription(pendingMerge.proposal)
                        : ''
                }
                confirmLabel="Combinar"
                cancelLabel="Cancelar"
                onConfirm={() =>
                    pendingMerge && void submit(pendingMerge.values, true)
                }
                isPending={save.isPending}
            />
        </Form>
    );
}
