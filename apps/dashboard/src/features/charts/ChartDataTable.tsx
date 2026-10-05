import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type ChartDataTableProps = {
    caption: string;
    columns: ReadonlyArray<{ key: string; label: string }>;
    rows: ReadonlyArray<Record<string, string | number>>;
};

/** The chart's table view: the same values as text, behind a disclosure, so nothing depends on reading colors. */
export function ChartDataTable({
    caption,
    columns,
    rows,
}: ChartDataTableProps) {
    return (
        <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted-foreground select-none">
                Ver datos en tabla
            </summary>
            <div className="mt-2 max-h-64 overflow-auto rounded-md border">
                <Table>
                    <caption className="sr-only">{caption}</caption>
                    <TableHeader>
                        <TableRow>
                            {columns.map((column) => (
                                <TableHead key={column.key}>
                                    {column.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={index}>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.key}
                                        className="tabular-nums"
                                    >
                                        {row[column.key]}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </details>
    );
}
