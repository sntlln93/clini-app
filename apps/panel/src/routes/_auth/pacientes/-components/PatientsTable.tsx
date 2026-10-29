import { DataTable } from '@/components/DataTable';
import { DataTableRowActions } from '@/components/DataTableRowActions';
import type { Patient } from '@/types/patient';
import { Link, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { documentLabel } from './patient-labels';

// The member number only means something next to its provider (#289), so it never shows on its own.
function insuranceLabel({
    insurance_provider,
    insurance_member_number,
}: Patient): string {
    if (!insurance_provider) return '—';

    return insurance_member_number
        ? `${insurance_provider.name} · ${insurance_member_number}`
        : insurance_provider.name;
}

type PatientsTableProps = {
    patients: Patient[];
    empty: ReactNode;
};

function PatientRowActions({ patient }: { patient: Patient }) {
    const navigate = useNavigate();

    return (
        <DataTableRowActions
            actions={[
                {
                    label: 'Ver',
                    icon: Eye,
                    onSelect: () =>
                        navigate({
                            to: '/pacientes/$id',
                            params: { id: patient.id },
                        }),
                },
                {
                    label: 'Editar',
                    icon: Pencil,
                    onSelect: () =>
                        navigate({
                            to: '/pacientes/$id/editar',
                            params: { id: patient.id },
                        }),
                },
            ]}
        />
    );
}

const columns: ColumnDef<Patient, unknown>[] = [
    {
        accessorKey: 'name',
        header: 'Nombre',
        cell: ({ row }) => (
            <Link
                to="/pacientes/$id"
                params={{ id: row.original.id }}
                className="font-medium underline-offset-4 hover:underline focus-visible:underline"
            >
                {row.original.name}
            </Link>
        ),
    },
    {
        id: 'document',
        header: 'Documento',
        cell: ({ row }) => documentLabel(row.original),
        meta: { className: 'tabular-nums' },
    },
    {
        id: 'phone',
        header: 'Teléfono',
        cell: ({ row }) => row.original.phone ?? '—',
        meta: { className: 'hidden md:table-cell tabular-nums' },
    },
    {
        id: 'insurance',
        header: 'Obra social',
        cell: ({ row }) => insuranceLabel(row.original),
        meta: { className: 'hidden md:table-cell' },
    },
    {
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => <PatientRowActions patient={row.original} />,
        meta: { className: 'text-right' },
    },
];

export function PatientsTable({ patients, empty }: PatientsTableProps) {
    return <DataTable columns={columns} data={patients} empty={empty} />;
}
