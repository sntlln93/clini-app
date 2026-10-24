import { DataTable } from '@/components/DataTable';
import { CLINICAL_ACCESS_REASON_LABELS } from '@/lib/clinical-access';
import { formatShortDateTime } from '@/lib/datetime';
import type { ExceptionalAccess } from '@/types/clinical-access';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

const columns: ColumnDef<ExceptionalAccess, unknown>[] = [
    {
        id: 'created_at',
        header: 'Fecha y hora',
        cell: ({ row }) => formatShortDateTime(row.original.created_at),
        meta: { className: 'tabular-nums' },
    },
    {
        id: 'professional',
        header: 'Profesional',
        cell: ({ row }) => row.original.professional.name ?? '—',
    },
    {
        id: 'patient',
        header: 'Paciente',
        cell: ({ row }) => (
            <Link
                to="/pacientes/$id"
                params={{ id: row.original.patient.id }}
                className="font-medium underline-offset-4 hover:underline focus-visible:underline"
            >
                {row.original.patient.name ?? '—'}
            </Link>
        ),
    },
    {
        id: 'reason',
        header: 'Motivo',
        cell: ({ row }) => CLINICAL_ACCESS_REASON_LABELS[row.original.reason],
    },
];

export function ExceptionalAccessesTable({
    accesses,
    empty,
}: {
    accesses: ExceptionalAccess[];
    empty: ReactNode;
}) {
    return <DataTable columns={columns} data={accesses} empty={empty} />;
}
