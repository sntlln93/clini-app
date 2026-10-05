import { EmptyState } from '@/components/EmptyState';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { AUDIT_ACTION_LABELS } from '@/lib/labels';
import type { AdminAuditLog, AuditSubjectType } from '@/types/audit';
import type { Paginated } from '@/types/pagination';
import { Link } from '@tanstack/react-router';
import { ScrollText } from 'lucide-react';
import { auditNote } from './audit-summary';

/** "Historial de auditoría" of one organization/user/subscription: who did what, when and why. */
type SubjectAuditCardProps = {
    logs: Paginated<AdminAuditLog>;
    subjectType: AuditSubjectType;
    subjectId: number;
};

export function SubjectAuditCard({
    logs,
    subjectType,
    subjectId,
}: SubjectAuditCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de auditoría</CardTitle>
                <CardDescription>
                    Acciones de operadores sobre este registro, de la más
                    reciente a la más antigua.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {logs.data.length === 0 ? (
                    <EmptyState
                        icon={ScrollText}
                        title="Sin acciones registradas"
                        description="Ningún operador modificó este registro todavía."
                    />
                ) : (
                    <ol className="divide-y">
                        {logs.data.map((log) => {
                            const note = auditNote(log.metadata);

                            return (
                                <li key={log.id} className="space-y-1 py-3">
                                    <p className="text-sm">
                                        <span className="font-medium">
                                            {AUDIT_ACTION_LABELS[log.action]}
                                        </span>{' '}
                                        <span className="text-muted-foreground">
                                            · {log.platform_admin.name}
                                        </span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDateTime(log.created_at)}
                                    </p>
                                    {note && (
                                        <p className="text-sm wrap-break-word">
                                            “{note}”
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                )}
                {logs.meta.total > logs.data.length && (
                    <p className="mt-3 text-xs text-muted-foreground">
                        Mostrando las {logs.data.length} más recientes de{' '}
                        {logs.meta.total}.{' '}
                        <Link
                            to="/auditoria"
                            search={{
                                subject_type: subjectType,
                                subject_id: subjectId,
                            }}
                            className="touch-target-exempt font-medium text-foreground underline underline-offset-4"
                        >
                            Ver todo en Auditoría
                        </Link>
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
