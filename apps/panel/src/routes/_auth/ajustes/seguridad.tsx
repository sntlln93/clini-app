import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { titleHead } from '@/lib/page-title';
import { sessionQueryOptions } from '@/lib/session';
import { createFileRoute } from '@tanstack/react-router';
import { TwoFactorSection } from './-components/TwoFactorSection';

export const Route = createFileRoute('/_auth/ajustes/seguridad')({
    head: () => titleHead('Seguridad', 'Ajustes'),
    loader: async ({ context }) => {
        const session =
            await context.queryClient.ensureQueryData(sessionQueryOptions);

        return { twoFactorEnabled: session.two_factor_enabled };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: SeguridadPage,
});

function SeguridadPage() {
    const { twoFactorEnabled } = Route.useLoaderData();

    return <TwoFactorSection enabled={twoFactorEnabled} />;
}
