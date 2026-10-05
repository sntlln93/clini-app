import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DashboardHeader } from '@/features/dashboard-header/DashboardHeader';
import { DashboardSidebar } from '@/features/dashboard-sidebar/DashboardSidebar';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useRouteFocus } from '@/hooks/use-route-focus';
import { useRef, type ReactNode } from 'react';

export function DashboardLayout({ children }: { children: ReactNode }) {
    const [open, setOpen] = usePersistedState('sidebar:open', true);
    const mainRef = useRef<HTMLElement>(null);
    useRouteFocus(mainRef);

    return (
        <TooltipProvider>
            <SidebarProvider open={open} onOpenChange={setOpen}>
                <a
                    href="#main-content"
                    className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
                >
                    Saltar al contenido principal
                </a>
                <DashboardSidebar />
                <div className="relative flex min-h-svh w-full min-w-0 flex-1 flex-col bg-background">
                    <DashboardHeader />
                    <main
                        id="main-content"
                        ref={mainRef}
                        tabIndex={-1}
                        className="min-w-0 flex-1 overflow-auto p-4 md:p-6"
                    >
                        {children}
                    </main>
                </div>
            </SidebarProvider>
        </TooltipProvider>
    );
}
