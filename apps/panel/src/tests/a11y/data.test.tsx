import type { ColumnDef } from '@tanstack/react-table';
import { render } from '@testing-library/react';
import { describe, it, vi } from 'vitest';

import { DataTable } from '@/components/DataTable';
import { DataTablePagination } from '@/components/DataTablePagination';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { expectNoA11yViolations } from '../a11y';

type Row = { id: number; name: string; email: string };

const COLUMNS: ColumnDef<Row, unknown>[] = [
    { accessorKey: 'name', header: 'Nombre' },
    { accessorKey: 'email', header: 'Email' },
];

describe('data a11y', () => {
    it('table: a captioned table with headers and rows has no violations', async () => {
        const { container } = render(
            <Table>
                <TableCaption>Pacientes registrados</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>Juan Pérez</TableCell>
                        <TableCell>juan@clini.app</TableCell>
                    </TableRow>
                </TableBody>
            </Table>,
        );
        await expectNoA11yViolations(container);
    });

    it('DataTable: header + row composition has no violations', async () => {
        const { container } = render(
            <DataTable
                columns={COLUMNS}
                data={[{ id: 1, name: 'Juan Pérez', email: 'juan@clini.app' }]}
                empty={<p>Sin resultados.</p>}
            />,
        );
        await expectNoA11yViolations(container);
    });

    it('DataTablePagination: a multi-page summary with prev/next/page controls has no violations', async () => {
        const { container } = render(
            <DataTablePagination
                currentPage={2}
                lastPage={5}
                total={50}
                label="pacientes"
                onPageChange={vi.fn()}
            />,
        );
        await expectNoA11yViolations(container);
    });

    it('pagination: a full Pagination composition with an ellipsis has no violations', async () => {
        // This project only ever consumes these primitives as buttons that
        // drive client-side page state (see DataTablePagination.tsx), never
        // as real `href` links — matched here instead of inventing an
        // anchor-based usage that doesn't exist in the codebase.
        const { container } = render(
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious onClick={() => {}} />
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationLink onClick={() => {}}>1</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationEllipsis />
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationLink isActive onClick={() => {}}>
                            10
                        </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationNext onClick={() => {}} />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>,
        );
        await expectNoA11yViolations(container);
    });
});
