import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PanelFooter } from '@/features/panel-footer/PanelFooter';
import { PanelHeader } from '@/features/panel-header/PanelHeader';
import { PanelSidebar } from '@/features/panel-sidebar/PanelSidebar';
import { usePersistedState } from '@/hooks/use-persisted-state';
import type { ReactNode } from 'react';

export function PanelLayout({ children }: { children: ReactNode }) {
    const [open, setOpen] = usePersistedState('sidebar:open', true);

    return (
        <TooltipProvider>
            <SidebarProvider open={open} onOpenChange={setOpen}>
                <a
                    href="#main-content"
                    className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
                >
                    Saltar al contenido principal
                </a>
                <PanelSidebar />
                <div className="relative flex min-h-svh w-full min-w-0 flex-1 flex-col bg-background">
                    <PanelHeader />
                    <main
                        id="main-content"
                        className="min-w-0 flex-1 overflow-auto p-4 md:p-6"
                    >
                        {children}
                    </main>
                    <PanelFooter />
                </div>
            </SidebarProvider>
        </TooltipProvider>
    );
}
