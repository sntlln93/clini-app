import { DateTime } from '@/lib/datetime';

export function PanelFooter() {
    return (
        <footer className="shrink-0 border-t px-4 py-3 text-center text-xs text-muted-foreground">
            © {DateTime.now().year} Clini
        </footer>
    );
}
