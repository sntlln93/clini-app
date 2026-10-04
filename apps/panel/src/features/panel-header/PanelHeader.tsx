import { SidebarTrigger } from '@/components/ui/sidebar';
import { useSession } from '@/lib/session';

export function PanelHeader() {
    const { data: session } = useSession();

    return (
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger />
            {session && <OrganizationName name={session.organization?.name} />}
        </header>
    );
}

/** The active organization, so a member of several knows where they're working. */
function OrganizationName({ name }: { name: string | undefined }) {
    if (!name) {
        return (
            <span className="min-w-0 truncate text-sm text-muted-foreground">
                Sin consultorio
            </span>
        );
    }

    return (
        <span className="min-w-0 truncate font-semibold" title={name}>
            {name}
        </span>
    );
}
