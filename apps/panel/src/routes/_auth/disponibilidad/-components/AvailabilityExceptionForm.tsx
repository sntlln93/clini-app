import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import type { AvailabilityException } from '@/types/availability';
import { useSaveAvailabilityException } from '../-hooks/use-availability-exceptions';
import { AvailabilityExceptionFields } from './AvailabilityExceptionFields';
import {
    availabilityExceptionSchema,
    type AvailabilityExceptionFormValues,
} from './availability-schemas';

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

    async function onSubmit(values: AvailabilityExceptionFormValues) {
        try {
            await mutateAsync({
                id: exception?.id,
                membershipId: values.isOrgWide ? null : membershipId,
                type: values.type,
                startAt: values.startAt,
                endAt: values.endAt,
                reason: values.reason || null,
            });
            onDone();
        } catch (error) {
            applyFormErrors(form, extractFormErrors(error), {
                start_at: 'startAt',
                end_at: 'endAt',
            });
        }
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
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
        </Form>
    );
}
