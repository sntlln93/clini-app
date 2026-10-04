import { sessionQueryOptions } from '@/lib/session';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NoProfessionalsEmptyState } from './NoProfessionalsEmptyState';

function renderEmptyState(permissions: string[]) {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sessionQueryOptions.queryKey, {
        id: 1,
        name: 'Ana',
        email: 'ana@example.com',
        permissions,
    });
    const router = createRouter({
        routeTree: createRootRoute({
            component: () => (
                <QueryClientProvider client={queryClient}>
                    <NoProfessionalsEmptyState description="Invitá a un profesional para configurar sus horarios." />
                </QueryClientProvider>
            ),
        }),
        history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
}

describe('NoProfessionalsEmptyState', () => {
    it('offers the invite CTA with memberships.manage', async () => {
        renderEmptyState(['memberships.manage']);

        const cta = await screen.findByRole('button', {
            name: 'Invitar profesional',
        });
        expect(cta.getAttribute('href')).toBe('/profesionales/nuevo');
        screen.getByText(
            'Invitá a un profesional para configurar sus horarios.',
        );
    });

    it('tells who to ask, with no CTA, without memberships.manage', async () => {
        renderEmptyState(['availability.view']);

        await screen.findByText(
            'Pedile a un administrador que invite a un profesional.',
        );
        expect(
            screen.queryByRole('button', { name: 'Invitar profesional' }),
        ).toBeNull();
    });
});
