import { Button } from '@/components/ui/button';
import { EmptyState } from '@/features/empty-state/EmptyState';
import { sessionHasPermission, useSession } from '@/lib/session';
import { Link } from '@tanstack/react-router';
import { MailPlus } from 'lucide-react';
import type { ComponentProps } from 'react';
import {
    JoinAsProfessionalButton,
    joinableMembership,
} from './JoinAsProfessionalButton';

type NoProfessionalsEmptyStateProps = {
    /** Next step shown to someone who can invite, e.g. what the invitee unlocks on this page. */
    description: string;
} & Pick<ComponentProps<typeof EmptyState>, 'size' | 'framed'>;

/**
 * Only offers the invite CTA with `memberships.manage`; otherwise says who can
 * unblock the page. A manager who isn't a professional yet is also offered to
 * join as one (#278): in a small practice the owner often sees patients too.
 */
export function NoProfessionalsEmptyState({
    description,
    size,
    framed,
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

    function title() {
        if (!canInvite) {
            return 'Todavía no hay profesionales';
        }

        return ownMembership
            ? 'Sumá a tu primer profesional'
            : 'Invitá a tu primer profesional';
    }

    return (
        <EmptyState
            illustration="team"
            title={title()}
            description={invitationDescription()}
            size={size}
            framed={framed}
            action={
                canInvite ? (
                    <>
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
                            <MailPlus data-icon="inline-start" />
                            Invitar profesional
                        </Button>
                    </>
                ) : undefined
            }
        />
    );
}
