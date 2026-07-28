import { EmptyState } from '@/components/EmptyState';
import { QueryErrorState } from '@/components/QueryErrorState';
import type { Membership } from '@/types/membership';
import { createFileRoute } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { InviteMemberDialog } from './-components/InviteMemberDialog';
import { MemberEditDialog } from './-components/MemberEditDialog';
import { MembersTable } from './-components/MembersTable';
import { useMemberships } from './-hooks/use-memberships';

export const Route = createFileRoute('/_auth/profesionales/')({
    component: ProfesionalesPage,
});

function ProfesionalesPage() {
    const { data: memberships, isPending, isError, error } = useMemberships();
    const [editingMembership, setEditingMembership] =
        useState<Membership | null>(null);

    const empty = (
        <EmptyState
            icon={UserPlus}
            title="Todavía no hay miembros"
            description="Invitá a un profesional para que pueda gestionar su agenda."
            action={<InviteMemberDialog />}
        />
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">Profesionales</h1>
                <InviteMemberDialog />
            </header>

            {isError && <QueryErrorState error={error} />}

            {!isError && isPending && (
                <p className="text-sm text-muted-foreground">Cargando…</p>
            )}

            {!isError && !isPending && memberships && (
                <MembersTable
                    memberships={memberships}
                    onEdit={setEditingMembership}
                    empty={empty}
                />
            )}

            <MemberEditDialog
                membership={editingMembership}
                onClose={() => setEditingMembership(null)}
            />
        </div>
    );
}
