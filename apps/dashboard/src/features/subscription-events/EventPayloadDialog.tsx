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
import type { SubscriptionEvent } from '@/types/subscription';
import { Braces } from 'lucide-react';

/** "Ver payload": the raw notification body, pretty-printed, for support/debugging. */
export function EventPayloadDialog({ event }: { event: SubscriptionEvent }) {
    return (
        <Dialog>
            <DialogTrigger
                render={
                    <Button variant="ghost" size="sm">
                        <Braces data-icon="inline-start" />
                        Ver payload
                    </Button>
                }
            />
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Payload del evento</DialogTitle>
                    <DialogDescription>
                        {event.type ?? 'Sin tipo'} · notificación{' '}
                        {event.notification_id} ·{' '}
                        {formatDateTime(event.created_at)}
                    </DialogDescription>
                </DialogHeader>
                <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 font-mono text-xs break-normal whitespace-pre">
                    {JSON.stringify(event.payload, null, 2)}
                </pre>
            </DialogContent>
        </Dialog>
    );
}
