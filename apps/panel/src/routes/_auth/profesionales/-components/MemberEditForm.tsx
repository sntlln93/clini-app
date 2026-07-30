import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import type { ErrorCode } from '@/lib/error-codes';
import { extractFormErrors } from '@/lib/form-errors';
import type { Membership } from '@/types/membership';
import {
    useDeactivateMembership,
    useUpdateMembership,
} from '../-hooks/use-update-membership';
import { MemberRoleFields, MemberStatusField } from './MemberRoleFields';
import { memberEditSchema, type MemberEditFormValues } from './member-schemas';

type MemberEditFormProps = {
    membership: Membership;
};

const UPDATE_MEMBERSHIP_FIELD_MAP: Partial<Record<ErrorCode, string>> = {
    'memberships.last_active_admin': 'roles',
};

export function MemberEditForm({ membership }: MemberEditFormProps) {
    const navigate = useNavigate();

    // The page mounts this form only once its membership has loaded, and it
    // never swaps to a different one in place, so the prop can seed
    // `defaultValues` directly — no `form.reset()` in an effect needed, unlike
    // the dialog this replaced.
    const form = useForm<MemberEditFormValues>({
        resolver: zodResolver(memberEditSchema),
        defaultValues: {
            roles: membership.roles,
            status: membership.status,
        },
    });

    const { mutateAsync, isPending } = useUpdateMembership(membership.id);
    const {
        mutate: deactivate,
        isPending: isDeactivating,
        message: deactivateMessage,
    } = useDeactivateMembership();

    function goToList() {
        navigate({ to: '/profesionales' });
    }

    async function onSubmit(values: MemberEditFormValues) {
        try {
            await mutateAsync(values);
            goToList();
        } catch (error) {
            const { message, errors } = extractFormErrors(
                error,
                UPDATE_MEMBERSHIP_FIELD_MAP,
            );

            if (errors.roles) {
                form.setError('roles', { message: errors.roles });
            }
            if (errors.status) {
                form.setError('status', { message: errors.status });
            }
            if (message) {
                form.setError('root', { message });
            }
        }
    }

    function handleConfirmDeactivate() {
        deactivate(membership.id, { onSuccess: goToList });
    }

    const generalError =
        form.formState.errors.root?.message ?? deactivateMessage;

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="max-w-xl space-y-4"
            >
                {generalError && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        {generalError}
                    </div>
                )}

                <MemberRoleFields control={form.control} name="roles" />
                <MemberStatusField control={form.control} name="status" />

                <div className="flex gap-2">
                    <Button
                        type="submit"
                        disabled={isPending || form.formState.isSubmitting}
                    >
                        {isPending ? 'Guardando…' : 'Guardar cambios'}
                    </Button>
                    <ConfirmDialog
                        trigger={
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={isDeactivating}
                            >
                                {isDeactivating
                                    ? 'Dando de baja…'
                                    : 'Dar de baja'}
                            </Button>
                        }
                        title="Dar de baja a este miembro"
                        description="¿Dar de baja a este miembro? Esta acción no se puede deshacer."
                        onConfirm={handleConfirmDeactivate}
                        isPending={isDeactivating}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        render={<Link to="/profesionales" />}
                        nativeButton={false}
                    >
                        Cancelar
                    </Button>
                </div>
            </form>
        </Form>
    );
}
