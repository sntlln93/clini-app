import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { sessionHasPermission, useSession } from '@/lib/session';
import { Link } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';
import {
    JoinAsProfessionalButton,
    joinableMembership,
} from './JoinAsProfessionalButton';

type NoProfessionalsEmptyStateProps = {
    /** Next step shown to someone who can invite, e.g. what the invitee unlocks on this page. */
    description: string;
};

/**
 * Only offers the invite CTA with `memberships.manage`; otherwise says who can
 * unblock the page. A manager who isn't a professional yet is also offered to
 * join as one (#278): in a small practice the owner often sees patients too.
 */
export function NoProfessionalsEmptyState({
    description,
}: NoProfessionalsEmptyStateProps) {
    const { data: session } = useSession();
    const canInvite = sessionHasPermission(session, 'memberships.manage');
    const ownMembership = joinableMembership(session);

    function invitationDescription() {
        if (!canInvite) {
            return 'Pedile a un administrador que invite a un profesional.';
        }

        return ownMembership
            ? `Si atendés pacientes, sumate como profesional. ${description}`
            : description;
    }

    return (
        <EmptyState
            icon={UserPlus}
            title="Todavía no hay profesionales"
            description={invitationDescription()}
            action={
                canInvite ? (
                    <div className="flex flex-wrap justify-center gap-2">
                        {ownMembership && (
                            <JoinAsProfessionalButton
                                membership={ownMembership}
                            />
                        )}
                        <Button
                            variant={ownMembership ? 'outline' : 'default'}
                            render={<Link to="/profesionales/nuevo" />}
                            nativeButton={false}
                        >
                            Invitar profesional
                        </Button>
                    </div>
                ) : undefined
            }
        />
    );
}
