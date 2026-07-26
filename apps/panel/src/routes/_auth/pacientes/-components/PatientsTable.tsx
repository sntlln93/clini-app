import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { Patient } from '@/types/patient';
import { Link } from '@tanstack/react-router';

const DOCUMENT_TYPE_LABELS: Record<Patient['document_type'], string> = {
    dni: 'DNI',
    passport: 'Pasaporte',
    insurance_id: 'Carnet de obra social',
};

type PatientsTableProps = {
    patients: Patient[];
};

export function PatientsTable({ patients }: PatientsTableProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Obra social</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {patients.map((patient) => (
                    <TableRow key={patient.id}>
                        <TableCell className="font-medium">
                            {patient.name}
                        </TableCell>
                        <TableCell>
                            {DOCUMENT_TYPE_LABELS[patient.document_type]}{' '}
                            {patient.document_number}
                        </TableCell>
                        <TableCell>{patient.phone ?? '—'}</TableCell>
                        <TableCell>
                            {patient.insurance_provider?.name ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                            <Link
                                to="/pacientes/$id/editar"
                                params={{ id: String(patient.id) }}
                                className="text-sm font-medium text-foreground underline underline-offset-4"
                            >
                                Editar
                            </Link>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
