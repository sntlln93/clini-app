import { DataTable } from '@/components/DataTable';
import { StatusPill } from '@/components/StatusPill';
import { formatNumber } from '@/lib/format';
import type { CatalogSpecialty } from '@/types/specialty';
import type { ColumnDef } from '@tanstack/react-table';

const NUMERIC = { className: 'text-right tabular-nums' };

function countColumn(
    key: keyof Pick<
        CatalogSpecialty,
        | 'backed_professionals'
        | 'offering_professionals'
        | 'offering_organizations'
    >,
    header: string,
): ColumnDef<CatalogSpecialty, unknown> {
    return {
        id: key,
        header,
        meta: NUMERIC,
        cell: ({ row }) => formatNumber(row.original[key]),
    };
}

const COLUMNS: ColumnDef<CatalogSpecialty, unknown>[] = [
    {
        id: 'name',
        header: 'Especialidad',
        cell: ({ row }) => (
            <div className="grid min-w-0">
                <span className="font-medium">{row.original.name}</span>
                {row.original.without_specialty && (
                    <span className="text-xs text-muted-foreground">
                        Sin especialidad
                    </span>
                )}
            </div>
        ),
    },
    countColumn('backed_professionals', 'Con respaldo'),
    countColumn('offering_professionals', 'La ofrecen'),
    countColumn('offering_organizations', 'Consultorios'),
    {
        id: 'unbacked_offers',
        header: 'Sin respaldo',
        meta: NUMERIC,
        cell: ({ row }) =>
            row.original.unbacked_offers > 0 ? (
                <StatusPill tone="warning">
                    {formatNumber(row.original.unbacked_offers)}
                </StatusPill>
            ) : (
                formatNumber(0)
            ),
    },
];

/** One profession's catalog rows with their platform-wide counts. */
export function SpecialtiesTable({
    specialties,
}: {
    specialties: CatalogSpecialty[];
}) {
    return (
        <DataTable
            columns={COLUMNS}
            data={specialties}
            empty={
                <p className="text-sm text-muted-foreground">
                    El registro todavía no respondió especialidades de esta
                    profesión.
                </p>
            }
        />
    );
}
