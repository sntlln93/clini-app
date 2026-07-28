import { Button } from '@/components/ui/button';
import type {
    Membership,
    MembershipRole,
    MembershipStatus,
} from '@/types/membership';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import {
    useDeactivateMembership,
    useUpdateMembership,
} from '../-hooks/use-update-membership';
import { MemberRoleFields } from './MemberRoleFields';

type MemberEditFormProps = {
    membership: Membership;
};

export function MemberEditForm({ membership }: MemberEditFormProps) {
    const navigate = useNavigate();
    const [roles, setRoles] = useState<MembershipRole[]>(
        () => membership.roles,
    );
    const [status, setStatus] = useState<MembershipStatus>(
        () => membership.status,
    );

    const { mutate, isPending, message, errors } = useUpdateMembership(
        membership.id,
    );
    const {
        mutate: deactivate,
        isPending: isDeactivating,
        message: deactivateMessage,
    } = useDeactivateMembership();

    function toggleRole(role: MembershipRole, checked: boolean) {
        setRoles((previous) =>
            checked
                ? [...previous, role]
                : previous.filter((current) => current !== role),
        );
    }

    function goToList() {
        navigate({ to: '/profesionales' });
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        mutate({ roles, status }, { onSuccess: goToList });
    }

    function handleDeactivate() {
        const confirmed = window.confirm(
            '¿Dar de baja a este miembro? Esta acción no se puede deshacer.',
        );

        if (!confirmed) {
            return;
        }

        deactivate(membership.id, { onSuccess: goToList });
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
            {(message ?? deactivateMessage) && (
                <p className="text-sm text-destructive">
                    {message ?? deactivateMessage}
                </p>
            )}

            <MemberRoleFields
                roles={roles}
                onToggleRole={toggleRole}
                status={status}
                onStatusChange={setStatus}
                errors={errors}
            />

            <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Guardando…' : 'Guardar cambios'}
                </Button>
                <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeactivate}
                    disabled={isDeactivating}
                >
                    {isDeactivating ? 'Dando de baja…' : 'Dar de baja'}
                </Button>
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
    );
}
