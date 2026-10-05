import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    type ColumnDef,
    type RowData,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';

declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- generic params are structural, required by the interface being augmented
    interface ColumnMeta<TData extends RowData, TValue> {
        className?: string;
    }
}

type DataTableProps<TData> = {
    columns: ColumnDef<TData, unknown>[];
    data: TData[];
    empty: ReactNode;
};

export function DataTable<TData>({
    columns,
    data,
    empty,
}: DataTableProps<TData>) {
    // eslint-disable-next-line react-hooks/incompatible-library -- @tanstack/react-table's table instance is recreated each render by design; this component never memoizes on it.
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
    });

    if (data.length === 0) {
        return <>{empty}</>;
    }

    return (
        <div className="overflow-auto rounded-md border">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <TableHead
                                    key={header.id}
                                    className={
                                        header.column.columnDef.meta?.className
                                    }
                                >
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext(),
                                          )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                                <TableCell
                                    key={cell.id}
                                    className={
                                        cell.column.columnDef.meta?.className
                                    }
                                >
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext(),
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
