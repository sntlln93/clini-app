import { DataTable } from '@/components/DataTable';
import { formatDateTime } from '@/lib/format';
import { AUDIT_ACTION_LABELS } from '@/lib/labels';
import type { AdminAuditLog } from '@/types/audit';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { AuditMetadataDialog } from './AuditMetadataDialog';
import { AuditSubjectLink } from './AuditSubjectLink';

const columns: ColumnDef<AdminAuditLog, unknown>[] = [
    {
        id: 'created_at',
        header: 'Fecha',
        cell: ({ row }) => formatDateTime(row.original.created_at),
        meta: { className: 'whitespace-nowrap tabular-nums' },
    },
    {
        id: 'operator',
        header: 'Operador',
        cell: ({ row }) => row.original.platform_admin.name,
    },
    {
        id: 'action',
        header: 'Acción',
        cell: ({ row }) => AUDIT_ACTION_LABELS[row.original.action],
    },
    {
        id: 'subject',
        header: 'Sobre',
        cell: ({ row }) => <AuditSubjectLink subject={row.original.subject} />,
    },
    {
        id: 'ip',
        header: 'IP',
        cell: ({ row }) => (
            <span className="font-mono text-xs">{row.original.ip ?? '—'}</span>
        ),
        meta: { className: 'hidden lg:table-cell' },
    },
    {
        id: 'detail',
        header: 'Detalle',
        cell: ({ row }) => <AuditMetadataDialog log={row.original} />,
        meta: { className: 'text-right' },
    },
];

export function AuditLogTable({
    logs,
    empty,
}: {
    logs: AdminAuditLog[];
    empty: ReactNode;
}) {
    return <DataTable columns={columns} data={logs} empty={empty} />;
}
