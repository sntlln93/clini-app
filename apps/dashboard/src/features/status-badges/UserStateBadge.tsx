import { Badge } from '@/components/ui/badge';
import { Ban, CircleCheck, MailWarning } from 'lucide-react';

type UserStateBadgeProps = {
    blockedAt: string | null;
    emailVerifiedAt: string | null;
};

/** Blocked wins over everything else: it is the state that locks the user out. */
export function UserStateBadge({
    blockedAt,
    emailVerifiedAt,
}: UserStateBadgeProps) {
    if (blockedAt !== null) {
        return (
            <Badge variant="destructive">
                <Ban data-icon="inline-start" />
                Bloqueado
            </Badge>
        );
    }

    if (emailVerifiedAt === null) {
        return (
            <Badge variant="outline">
                <MailWarning data-icon="inline-start" />
                Sin verificar
            </Badge>
        );
    }

    return (
        <Badge variant="secondary">
            <CircleCheck data-icon="inline-start" />
            Activo
        </Badge>
    );
}
