import { api } from '@/lib/api';
import { sessionHasPermission, sessionQueryOptions } from '@/lib/session';
import { queryOptions, type QueryClient } from '@tanstack/react-query';

/** `GET /organization/setup`'s `data` (#286). */
export type SetupProgress = {
    has_professional: boolean;
    has_service: boolean;
    has_availability: boolean;
    ready: boolean;
};

export const setupProgressQueryOptions = queryOptions({
    queryKey: ['organization-setup'],
    queryFn: () =>
        api
            .get<{ data: SetupProgress }>('/organization/setup')
            .then((response) => response.data.data),
});

/**
 * The «Primeros pasos» checklist for whoever manages the team (#286), or
 * null for anyone else. Its steps are completed from other pages (Ajustes,
 * Disponibilidad, Profesionales), so it is fetched fresh on every load
 * instead of being dropped by each of those mutations.
 */
export async function loadSetupProgress(
    queryClient: QueryClient,
): Promise<SetupProgress | null> {
    const session = await queryClient.ensureQueryData(sessionQueryOptions);

    if (!sessionHasPermission(session, 'memberships.manage')) {
        return null;
    }

    return queryClient.fetchQuery({
        ...setupProgressQueryOptions,
        staleTime: 0,
    });
}
