import { api } from '@/lib/api';
import type {
    AdminAuditAction,
    AdminAuditLog,
    AuditSubjectType,
} from '@/types/audit';
import type { Paginated } from '@/types/pagination';
import { queryOptions } from '@tanstack/react-query';

export type AuditLogParams = {
    action?: AdminAuditAction;
    platform_admin_id?: number;
    subject_type?: AuditSubjectType;
    subject_id?: number;
    from?: string;
    to?: string;
    page?: number;
    per_page?: number;
};

/** `GET /admin/audit-logs`; shared by the Auditoría page and every detail page's "Historial de auditoría". */
export function auditLogsQueryOptions(params: AuditLogParams) {
    return queryOptions({
        queryKey: ['audit-logs', params],
        queryFn: () =>
            api
                .get<Paginated<AdminAuditLog>>('/admin/audit-logs', { params })
                .then((response) => response.data),
    });
}

/** The latest audit rows about one subject (detail pages). */
export function subjectAuditQueryOptions(
    subjectType: AuditSubjectType,
    subjectId: number,
) {
    return auditLogsQueryOptions({
        subject_type: subjectType,
        subject_id: subjectId,
        per_page: 10,
    });
}
