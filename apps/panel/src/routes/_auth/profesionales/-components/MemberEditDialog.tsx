import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type {
    Membership,
    MembershipRole,
    MembershipStatus,
} from '@/types/membership';
import { useState, type FormEvent } from 'react';
import {
    useDeactivateMembership,
    useUpdateMembership,
} from '../-hooks/use-update-membership';
import { MemberRoleFields } from './MemberRoleFields';

type MemberEditDialogProps = {
    membership: Membership | null;
    onClose: () => void;
};

export function MemberEditDialog({
    membership,
    onClose,
}: MemberEditDialogProps) {
    const [roles, setRoles] = useState<MembershipRole[]>([]);
    const [status, setStatus] = useState<MembershipStatus>('active');
    const [appliedId, setAppliedId] = useState<number | null>(null);

    const membershipId = membership?.id ?? 0;
    const {
        mutate,
        isPending,
        message,
        errors,
        reset: resetUpdate,
    } = useUpdateMembership(membershipId);
    const {
        mutate: deactivate,
        isPending: isDeactivating,
        message: deactivateMessage,
        reset: resetDeactivate,
    } = useDeactivateMembership();

    // Adjust state during render instead of an Effect: sync the form's local
    // state whenever a different membership is opened for editing.
    if (membership && membership.id !== appliedId) {
        setAppliedId(membership.id);
        setRoles(membership.roles);
        setStatus(membership.status);
    }

    function toggleRole(role: MembershipRole, checked: boolean) {
        setRoles((previous) =>
            checked
                ? [...previous, role]
                : previous.filter((current) => current !== role),
        );
    }

    function handleOpenChange(open: boolean) {
        if (!open) {
            resetUpdate();
            resetDeactivate();
            onClose();
        }
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        mutate({ roles, status }, { onSuccess: onClose });
    }

    function handleDeactivate() {
        if (!membership) {
            return;
        }

        const confirmed = window.confirm(
            '¿Dar de baja a este miembro? Esta acción no se puede deshacer.',
        );

        if (!confirmed) {
            return;
        }

        deactivate(membership.id, { onSuccess: onClose });
    }

    return (
        <Dialog open={membership !== null} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar membresía</DialogTitle>
                    <DialogDescription>
                        {membership?.user.name ?? membership?.user.email}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
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

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDeactivate}
                            disabled={isDeactivating}
                        >
                            {isDeactivating ? 'Dando de baja…' : 'Dar de baja'}
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Guardando…' : 'Guardar cambios'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
