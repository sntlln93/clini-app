import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { sessionQueryOptions, type SessionUser } from '@/lib/session';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PanelHeader } from './PanelHeader';

function renderHeader(session: SessionUser) {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sessionQueryOptions.queryKey, session);

    render(
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <SidebarProvider>
                    <PanelHeader />
                </SidebarProvider>
            </TooltipProvider>
        </QueryClientProvider>,
    );
}

const user = { id: 1, name: 'Ana Ejemplo', email: 'ana@clini.app' };

describe('PanelHeader', () => {
    it("shows the active organization's name, with the full name as title", () => {
        renderHeader({
            ...user,
            organization: { id: 1, name: 'Consultorio Norte' },
        });

        const name = screen.getByText('Consultorio Norte');
        expect(name.getAttribute('title')).toBe('Consultorio Norte');
        expect(screen.queryByText('Clini')).toBeNull();
    });

    it('falls back to "Sin consultorio" when the session has no organization', () => {
        renderHeader({ ...user, organization: null });

        expect(screen.getByText('Sin consultorio')).not.toBeNull();
    });
});
