import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { ProfessionalDocument } from '@/types/professional-license';
import { useId, useState } from 'react';
import { useUpdateProfessionalDocument } from '../-hooks/use-professional-licenses';
import { RegistryProgress } from './RegistryProgress';

type ProfessionalDocumentSectionProps = {
    document: ProfessionalDocument;
};

// The professional's own DNI (#380): it brings their licenses and, from #417,
// the account's name from the registry. It is loaded once: from then on only
// support changes it, or the name.
export function ProfessionalDocumentSection({
    document,
}: ProfessionalDocumentSectionProps) {
    const { document_number: documentNumber, registry } = document;

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">Tu DNI</h2>
                <p className="text-sm text-muted-foreground">
                    Con él traemos tu nombre y tus matrículas del Buscador
                    Nacional de Profesionales de la Salud del Ministerio de
                    Salud. No lo ve nadie más del consultorio.
                </p>
            </div>
            {documentNumber === null ? (
                <DocumentForm />
            ) : (
                <div className="space-y-1">
                    <p className="text-sm font-medium">{documentNumber}</p>
                    <p className="text-sm text-muted-foreground">
                        Tu DNI y tu nombre salen del Buscador y no se pueden
                        cambiar desde acá. Si hay un error, comunicate con el
                        soporte de Clini.
                    </p>
                    {registry === 'not_found' && (
                        <p className="text-sm text-muted-foreground">
                            El Buscador Nacional de Profesionales de la Salud ya
                            no tiene matrículas para este DNI.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}

function DocumentForm() {
    const inputId = useId();
    const [value, setValue] = useState('');
    const { mutate, isPending } = useUpdateProfessionalDocument();
    const typed = value.replace(/[\s.]/g, '');

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-48 flex-1 space-y-1">
                    <Label
                        htmlFor={inputId}
                        className="text-xs text-muted-foreground"
                    >
                        DNI
                    </Label>
                    <Input
                        id={inputId}
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={10}
                        placeholder="Sin puntos"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                    />
                </div>
                <Button
                    type="button"
                    size="sm"
                    disabled={isPending || typed === ''}
                    onClick={() => mutate(typed)}
                >
                    {isPending && <Spinner data-icon="inline-start" />}
                    {isPending ? 'Guardando…' : 'Guardar'}
                </Button>
            </div>
            <p className="text-sm text-muted-foreground">
                Revisalo antes de guardarlo: una vez cargado, tu DNI y tu nombre
                solo los cambia el soporte de Clini.
            </p>
            {isPending && <RegistryProgress />}
        </div>
    );
}
