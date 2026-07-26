import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { DocumentType, PatientPayload } from '@/types/patient';

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
    { value: 'dni', label: 'DNI' },
    { value: 'passport', label: 'Pasaporte' },
    { value: 'insurance_id', label: 'Carnet de obra social' },
];

type PatientBasicFieldsProps = {
    values: PatientPayload;
    onChange: <K extends keyof PatientPayload>(
        field: K,
        value: PatientPayload[K],
    ) => void;
    errors: Record<string, string>;
};

export function PatientBasicFields({
    values,
    onChange,
    errors,
}: PatientBasicFieldsProps) {
    return (
        <>
            <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                    id="name"
                    value={values.name}
                    onChange={(event) => onChange('name', event.target.value)}
                    required
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="document_type">Tipo de documento</Label>
                    <Select
                        value={values.document_type}
                        onValueChange={(value) =>
                            onChange('document_type', value as DocumentType)
                        }
                    >
                        <SelectTrigger id="document_type" className="w-full">
                            <SelectValue placeholder="Seleccioná" />
                        </SelectTrigger>
                        <SelectContent>
                            {DOCUMENT_TYPE_OPTIONS.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.document_type && (
                        <p className="text-sm text-destructive">
                            {errors.document_type}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="document_number">Número de documento</Label>
                    <Input
                        id="document_number"
                        value={values.document_number}
                        onChange={(event) =>
                            onChange('document_number', event.target.value)
                        }
                        required
                    />
                    {errors.document_number && (
                        <p className="text-sm text-destructive">
                            {errors.document_number}
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                    id="email"
                    type="email"
                    value={values.email}
                    onChange={(event) => onChange('email', event.target.value)}
                />
                {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                    id="phone"
                    value={values.phone}
                    onChange={(event) => onChange('phone', event.target.value)}
                />
                {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                )}
            </div>
        </>
    );
}
