import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { extractFormErrors } from '@/lib/form-errors';
import type { Availability } from '@/types/availability';
import {
    useDeleteAvailability,
    useSaveAvailability,
} from '../-hooks/use-availabilities';
import { AvailabilitySlotFields } from './AvailabilitySlotFields';
import {
    availabilitySlotSchema,
    type AvailabilitySlotFormValues,
} from './availability-schemas';

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

    // `form.reset()` notifies Controller-subscribed children synchronously,
    // so syncing this row's slot whenever it (re)loads or changes remotely
    // has to happen in an effect rather than during render.
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

    async function onSubmit(values: AvailabilitySlotFormValues) {
        try {
            await save.mutateAsync({
                id: slot?.id,
                dayOfWeek,
                startTime: values.startTime,
                endTime: values.endTime,
            });
            onSaved?.();
        } catch (error) {
            const { message, errors } = extractFormErrors(error);

            if (errors.start_time) {
                form.setError('startTime', { message: errors.start_time });
            }
            if (errors.end_time) {
                form.setError('endTime', { message: errors.end_time });
            }
            if (message) {
                form.setError('root', { message });
            }
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
                onSubmit={form.handleSubmit(onSubmit)}
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
                                description="¿Eliminar este horario? Esta acción no se puede deshacer."
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
        </Form>
    );
}
