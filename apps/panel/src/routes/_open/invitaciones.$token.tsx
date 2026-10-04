import { titleHead } from '@/lib/page-title';
import { sessionQueryOptions } from '@/lib/session';
import { createFileRoute } from '@tanstack/react-router';
import { AcceptInvitationForm } from './-components/AcceptInvitationForm';

export const Route = createFileRoute('/_open/invitaciones/$token')({
    head: () => titleHead('Invitación'),
    // Optional session: accepting logs in as the invited account, so a visitor already signed in as someone else gets warned first.
    loader: async ({ context }) => {
        const sessionEmail = await context.queryClient
            .ensureQueryData(sessionQueryOptions)
            .then(
                (session) => session.email,
                () => null,
            );

        return { sessionEmail };
    },
    component: InvitacionPage,
});

function InvitacionPage() {
    const { token } = Route.useParams();
    const { sessionEmail } = Route.useLoaderData();

    return (
        <div className="w-full max-w-sm">
            <AcceptInvitationForm token={token} sessionEmail={sessionEmail} />
        </div>
    );
}
