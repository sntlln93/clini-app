import type { ColumnDef } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTable } from './DataTable';

type Row = { id: number; name: string; email: string };

const COLUMNS: ColumnDef<Row, unknown>[] = [
    {
        accessorKey: 'name',
        header: 'Nombre',
    },
    {
        accessorKey: 'email',
        header: 'Email',
        meta: { className: 'hidden md:table-cell' },
    },
];

function buildRows(count: number): Row[] {
    return Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        name: `Paciente ${index + 1}`,
        email: `paciente${index + 1}@clini.app`,
    }));
}

describe('DataTable', () => {
    it('renders the header label of each column and one row per item', () => {
        const data = buildRows(2);

        render(
            <DataTable
                columns={COLUMNS}
                data={data}
                empty={<p>Sin resultados.</p>}
            />,
        );

        expect(screen.getByText('Nombre')).not.toBeNull();
        expect(screen.getByText('Email')).not.toBeNull();
        expect(screen.getByText('Paciente 1')).not.toBeNull();
        expect(screen.getByText('Paciente 2')).not.toBeNull();
    });

    it('applies a column meta className to both the header and data cells', () => {
        render(
            <DataTable
                columns={COLUMNS}
                data={buildRows(1)}
                empty={<p>Sin resultados.</p>}
            />,
        );

        const headerCell = screen.getByText('Email').closest('th');
        const dataCell = screen.getByText('paciente1@clini.app').closest('td');

        expect(headerCell?.className).toContain('hidden md:table-cell');
        expect(dataCell?.className).toContain('hidden md:table-cell');
    });

    it('renders all 15 rows without slicing to a client-side page size', () => {
        const data = buildRows(15);

        render(
            <DataTable
                columns={COLUMNS}
                data={data}
                empty={<p>Sin resultados.</p>}
            />,
        );

        for (const row of data) {
            expect(screen.getByText(row.name)).not.toBeNull();
        }
    });

    it('renders the empty state and no table when data is empty', () => {
        render(
            <DataTable
                columns={COLUMNS}
                data={[]}
                empty={<p>Sin resultados.</p>}
            />,
        );

        expect(screen.getByText('Sin resultados.')).not.toBeNull();
        expect(screen.queryByRole('table')).toBeNull();
    });
});
