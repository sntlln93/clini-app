import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/format';
import { AUDIT_ACTION_LABELS } from '@/lib/labels';
import type { AdminAuditLog } from '@/types/audit';
import { FileJson } from 'lucide-react';

/** "Detalle": the row's metadata (reason/note, previous values) as pretty JSON. */
export function AuditMetadataDialog({ log }: { log: AdminAuditLog }) {
    return (
        <Dialog>
            <DialogTrigger
                render={
                    <Button variant="ghost" size="sm">
                        <FileJson data-icon="inline-start" />
                        Detalle
                    </Button>
                }
            />
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{AUDIT_ACTION_LABELS[log.action]}</DialogTitle>
                    <DialogDescription>
                        {log.platform_admin.name} ·{' '}
                        {formatDateTime(log.created_at)}
                        {log.ip ? ` · IP ${log.ip}` : ''}
                    </DialogDescription>
                </DialogHeader>
                <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre">
                    {JSON.stringify(log.metadata, null, 2)}
                </pre>
            </DialogContent>
        </Dialog>
    );
}
