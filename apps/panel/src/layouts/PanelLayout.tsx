import { TooltipProvider } from '@/components/ui/tooltip';
import { PanelBreadcrumbs } from '@/features/panel-breadcrumbs/PanelBreadcrumbs';
import { PanelFooter } from '@/features/panel-footer/PanelFooter';
import { PanelHeader } from '@/features/panel-header/PanelHeader';
import { PanelSecondaryNav } from '@/features/panel-nav/PanelSecondaryNav';
import { useSecondaryNav } from '@/features/panel-nav/secondary-nav';
import { SubscriptionBanner } from '@/features/subscription-banner/SubscriptionBanner';
import { useRouteFocus } from '@/hooks/use-route-focus';
import { usePlan } from '@/lib/plan';
import { useSubscription } from '@/lib/subscription';
import { useRef, type ReactNode } from 'react';

// Header with the main navigation, the page's own navigation under it when
// its route declares one (`staticData.secondaryNav`), then the content.
export function PanelLayout({ children }: { children: ReactNode }) {
    const mainRef = useRef<HTMLElement>(null);
    useRouteFocus(mainRef);
    const subscription = useSubscription();
    const plan = usePlan();
    const secondaryNav = useSecondaryNav();

    return (
        <TooltipProvider>
            <a
                href="#main-content"
                className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 print:hidden"
            >
                Saltar al contenido principal
            </a>
            <div className="flex min-h-svh w-full min-w-0 flex-col bg-background">
                {/* Panel chrome stays off paper when a page is printed. */}
                <div className="contents print:hidden">
                    <PanelHeader />
                    {secondaryNav && <PanelSecondaryNav nav={secondaryNav} />}
                </div>
                <main
                    id="main-content"
                    ref={mainRef}
                    tabIndex={-1}
                    className="mx-auto w-full max-w-screen-2xl min-w-0 flex-1 overflow-auto p-4 md:p-6 print:overflow-visible print:p-0"
                >
                    <div className="contents print:hidden">
                        <PanelBreadcrumbs />
                    </div>
                    <SubscriptionBanner
                        subscription={subscription}
                        plan={plan}
                    />
                    {children}
                </main>
                <div className="contents print:hidden">
                    <PanelFooter />
                </div>
            </div>
        </TooltipProvider>
    );
}
