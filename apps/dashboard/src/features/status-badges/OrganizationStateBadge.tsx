import { Badge } from '@/components/ui/badge';
import { Ban, CircleCheck } from 'lucide-react';

export function OrganizationStateBadge({
    suspendedAt,
}: {
    suspendedAt: string | null;
}) {
    if (suspendedAt !== null) {
        return (
            <Badge variant="destructive">
                <Ban data-icon="inline-start" />
                Suspendida
            </Badge>
        );
    }

    return (
        <Badge variant="secondary">
            <CircleCheck data-icon="inline-start" />
            Activa
        </Badge>
    );
}
