import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OrganizationStateBadge } from '@/features/status-badges/OrganizationStateBadge';
import { formatDate, formatDateTime } from '@/lib/format';
import type { AdminOrganizationDetail } from '@/types/organization';
import { Ban } from 'lucide-react';
import { ReactivateOrganizationDialog } from './ReactivateOrganizationDialog';
import { SuspendOrganizationDialog } from './SuspendOrganizationDialog';

export function OrganizationHeader({
    organization,
}: {
    organization: AdminOrganizationDetail;
}) {
    const suspended = organization.suspended_at !== null;

    return (
        <div className="space-y-4">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl tracking-tight wrap-break-word">
                            {organization.name}
                        </h1>
                        <OrganizationStateBadge
                            suspendedAt={organization.suspended_at}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-mono">{organization.slug}</span> ·{' '}
                        {organization.timezone} · alta{' '}
                        {formatDate(organization.created_at)}
                    </p>
                </div>
                {suspended ? (
                    <ReactivateOrganizationDialog
                        organizationId={organization.id}
                    />
                ) : (
                    <SuspendOrganizationDialog
                        organizationId={organization.id}
                    />
                )}
            </header>
            {suspended && (
                <Alert variant="destructive">
                    <Ban />
                    <AlertTitle>
                        Suspendida el{' '}
                        {formatDateTime(organization.suspended_at)}
                    </AlertTitle>
                    <AlertDescription className="wrap-break-word">
                        {organization.suspension_reason ??
                            'Sin motivo registrado.'}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
