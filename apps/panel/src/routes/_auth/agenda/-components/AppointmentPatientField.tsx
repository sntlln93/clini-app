import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Patient } from '@/types/patient';

type AppointmentPatientFieldProps = {
    patientId: number | null;
    onPatientIdChange: (patientId: number) => void;
    patients: Patient[];
    patientQuery: string;
    onPatientQueryChange: (query: string) => void;
    error?: string;
};

export function AppointmentPatientField({
    patientId,
    onPatientIdChange,
    patients,
    patientQuery,
    onPatientQueryChange,
    error,
}: AppointmentPatientFieldProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor="patient_search">Paciente</Label>
            <Input
                id="patient_search"
                placeholder="Buscar por nombre o documento…"
                value={patientQuery}
                onChange={(event) => onPatientQueryChange(event.target.value)}
            />
            <Select
                value={patientId !== null ? String(patientId) : ''}
                onValueChange={(value) => {
                    if (value === '') {
                        return;
                    }
                    onPatientIdChange(Number(value));
                }}
            >
                <SelectTrigger id="patient_id" className="w-full">
                    <SelectValue placeholder="Seleccioná un paciente" />
                </SelectTrigger>
                <SelectContent>
                    {patients.map((patient) => (
                        <SelectItem key={patient.id} value={String(patient.id)}>
                            {patient.name} — {patient.document_number}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
