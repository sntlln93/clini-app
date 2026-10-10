import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserStateBadge } from '@/features/status-badges/UserStateBadge';
import { formatDate, formatDateTime } from '@/lib/format';
import type { AdminUserDetail } from '@/types/user';
import { Ban } from 'lucide-react';
import { BlockUserDialog } from './BlockUserDialog';
import { UnblockUserDialog } from './UnblockUserDialog';
import { VerifyEmailDialog } from './VerifyEmailDialog';

export function UserHeader({ user }: { user: AdminUserDetail }) {
    const blocked = user.blocked_at !== null;

    return (
        <div className="space-y-4">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl tracking-tight wrap-break-word">
                            {user.name}
                        </h1>
                        <UserStateBadge
                            blockedAt={user.blocked_at}
                            emailVerifiedAt={user.email_verified_at}
                        />
                    </div>
                    <p className="text-sm break-all text-muted-foreground">
                        {user.email} · alta {formatDate(user.created_at)} ·{' '}
                        {user.email_verified_at
                            ? `correo verificado el ${formatDate(user.email_verified_at)}`
                            : 'correo sin verificar'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <VerifyEmailDialog
                        userId={user.id}
                        email={user.email}
                        emailVerifiedAt={user.email_verified_at}
                    />
                    {blocked ? (
                        <UnblockUserDialog userId={user.id} />
                    ) : (
                        <BlockUserDialog userId={user.id} />
                    )}
                </div>
            </header>
            {blocked && (
                <Alert variant="destructive">
                    <Ban />
                    <AlertTitle>
                        Bloqueado el {formatDateTime(user.blocked_at)}
                    </AlertTitle>
                    <AlertDescription className="wrap-break-word">
                        {user.block_reason ?? 'Sin motivo registrado.'}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
