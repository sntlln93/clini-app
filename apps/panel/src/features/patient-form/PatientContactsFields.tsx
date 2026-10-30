import { Plus } from 'lucide-react';
import { useFieldArray, type Control } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
    emptyContactDraft,
    PATIENT_CONTACTS_MAX,
} from '@/lib/patient-contacts';
import type { PatientPayload } from '@/types/patient';
import { PatientContactRow } from './PatientContactRow';

type PatientContactsFieldsProps = {
    control: Control<PatientPayload>;
};

// The patient's phones, WhatsApp numbers and emails (#365); a row left empty
// is not saved.
export function PatientContactsFields({ control }: PatientContactsFieldsProps) {
    const contacts = useFieldArray({ control, name: 'contacts' });

    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">Contactos (opcional)</p>
            {contacts.fields.map((field, index) => (
                <PatientContactRow
                    key={field.id}
                    control={control}
                    index={index}
                    onRemove={() => contacts.remove(index)}
                />
            ))}
            {contacts.fields.length < PATIENT_CONTACTS_MAX && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => contacts.append(emptyContactDraft('phone'))}
                >
                    <Plus data-icon="inline-start" />
                    Agregar contacto
                </Button>
            )}
        </div>
    );
}
