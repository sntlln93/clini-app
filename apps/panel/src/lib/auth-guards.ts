import { sessionQueryOptions } from '@/lib/session';
import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';

type GuardContext = {
    queryClient: QueryClient;
};

export async function requireSession({ queryClient }: GuardContext) {
    try {
        await queryClient.ensureQueryData(sessionQueryOptions);
    } catch {
        throw redirect({ to: '/login' });
    }
}

export async function redirectIfAuthenticated({ queryClient }: GuardContext) {
    try {
        await queryClient.ensureQueryData(sessionQueryOptions);
    } catch {
        return;
    }

    throw redirect({ to: '/agenda' });
}
