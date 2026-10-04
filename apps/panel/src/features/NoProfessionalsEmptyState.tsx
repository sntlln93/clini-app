import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { sessionHasPermission, useSession } from '@/lib/session';
import { Link } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';

type NoProfessionalsEmptyStateProps = {
    /** Next step shown to someone who can invite, e.g. what the invitee unlocks on this page. */
    description: string;
};

/** Only offers the invite CTA with `memberships.manage`; otherwise says who can unblock the page. */
export function NoProfessionalsEmptyState({
    description,
}: NoProfessionalsEmptyStateProps) {
    const { data: session } = useSession();
    const canInvite = sessionHasPermission(session, 'memberships.manage');

    return (
        <EmptyState
            icon={UserPlus}
            title="Todavía no hay profesionales"
            description={
                canInvite
                    ? description
                    : 'Pedile a un administrador que invite a un profesional.'
            }
            action={
                canInvite ? (
                    <Button
                        render={<Link to="/profesionales/nuevo" />}
                        nativeButton={false}
                    >
                        Invitar profesional
                    </Button>
                ) : undefined
            }
        />
    );
}
