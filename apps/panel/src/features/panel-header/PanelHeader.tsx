import { SidebarTrigger } from '@/components/ui/sidebar';

export function PanelHeader() {
    return (
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger />
            <span className="font-semibold">Clini</span>
        </header>
    );
}
