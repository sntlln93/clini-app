import { DataTable } from '@/components/DataTable';
import { DataTableRowActions } from '@/components/DataTableRowActions';
import type { Patient } from '@/types/patient';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

const DOCUMENT_TYPE_LABELS: Record<Patient['document_type'], string> = {
    dni: 'DNI',
    passport: 'Pasaporte',
    insurance_id: 'Carnet de obra social',
};

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
            <span className="font-medium">{row.original.name}</span>
        ),
    },
    {
        id: 'document',
        header: 'Documento',
        cell: ({ row }) =>
            `${DOCUMENT_TYPE_LABELS[row.original.document_type]} ${row.original.document_number}`,
    },
    {
        id: 'phone',
        header: 'Teléfono',
        cell: ({ row }) => row.original.phone ?? '—',
        meta: { className: 'hidden md:table-cell' },
    },
    {
        id: 'insurance',
        header: 'Obra social',
        cell: ({ row }) => row.original.insurance_provider?.name ?? '—',
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
