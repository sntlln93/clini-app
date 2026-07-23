import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function PanelHeader() {
    return (
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger />
            <Separator
                orientation="vertical"
                className="mr-1 data-[orientation=vertical]:h-5"
            />
            <span className="font-semibold">Clini</span>
        </header>
    );
}
