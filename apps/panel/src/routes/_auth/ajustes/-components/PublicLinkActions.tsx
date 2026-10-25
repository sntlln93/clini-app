import { Button, buttonVariants } from '@/components/ui/button';
import { copyBookingLink } from '@/lib/booking-link';
import { cn } from '@/lib/utils';
import { Copy, ExternalLink } from 'lucide-react';

/** The saved link only — an unsaved draft would hand out a URL that doesn't resolve yet. */
export function PublicLinkActions({
    url,
    label = 'Tu link',
}: {
    url: string;
    label?: string;
}) {
    return (
        <div className="space-y-2">
            <p className="text-sm break-all text-muted-foreground">
                {label}: <span className="text-foreground">{url}</span>
            </p>
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void copyBookingLink(url)}
                >
                    <Copy data-icon="inline-start" />
                    Copiar link
                </Button>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                        buttonVariants({
                            variant: 'outline',
                            size: 'sm',
                        }),
                    )}
                >
                    <ExternalLink data-icon="inline-start" />
                    Abrir
                </a>
            </div>
        </div>
    );
}
