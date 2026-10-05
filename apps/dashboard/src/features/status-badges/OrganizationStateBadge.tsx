import { StatusPill } from '@/components/StatusPill';

export function OrganizationStateBadge({
    suspendedAt,
}: {
    suspendedAt: string | null;
}) {
    return suspendedAt !== null ? (
        <StatusPill tone="danger">Suspendida</StatusPill>
    ) : (
        <StatusPill tone="success">Activa</StatusPill>
    );
}
