import { createFileRoute } from '@tanstack/react-router';
import { AcceptInvitationForm } from './-components/AcceptInvitationForm';

export const Route = createFileRoute('/_public/invitaciones/$token')({
    component: InvitacionPage,
});

function InvitacionPage() {
    const { token } = Route.useParams();

    return (
        <div className="w-full max-w-sm">
            <AcceptInvitationForm token={token} />
        </div>
    );
}
