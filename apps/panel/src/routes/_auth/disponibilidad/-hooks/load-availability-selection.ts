import { ensureScopedProfessionals } from '@/hooks/use-professionals';
import { sessionQueryOptions, type SessionUser } from '@/lib/session';
import type { Professional } from '@/types/professional';
import type { QueryClient } from '@tanstack/react-query';

export type AvailabilitySelection = {
    professionals: Professional[];
    selected: Professional | undefined;
};

/** Duplicates `useAvailabilityPermissions`' own-vs-org-wide rule because loaders run outside React and can't use the hook directly. */
function defaultMembership(
    professionals: Professional[],
    session: SessionUser | undefined,
): Professional | undefined {
    if (professionals.length === 0) {
        return undefined;
    }

    const permissions = session?.permissions ?? [];
    if (permissions.includes('availability.manage')) {
        return professionals[0];
    }

    return (
        professionals.find(
            (membership) => membership.user.id === session?.id,
        ) ?? professionals[0]
    );
}

/**
 * The professionals the page can show and the one it shows: `?membershipId=`
 * when it names one of them, else the default. Both sub-pages and their
 * layout read it; the queries are cached, so each loader may call it.
 */
export async function loadAvailabilitySelection(
    queryClient: QueryClient,
    membershipId: number | undefined,
): Promise<AvailabilitySelection> {
    const [session, professionals] = await Promise.all([
        queryClient.ensureQueryData(sessionQueryOptions),
        ensureScopedProfessionals(queryClient),
    ]);

    const selected =
        professionals.find((membership) => membership.id === membershipId) ??
        defaultMembership(professionals, session);

    return { professionals, selected };
}
