import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useId, useState } from 'react';
import { useUpdateProfessionalDocument } from '../-hooks/use-professional-licenses';

type ProfessionalDocumentSectionProps = {
    documentNumber: string | null;
};

// The professional's own DNI (#380): only to look their licenses up.
export function ProfessionalDocumentSection({
    documentNumber,
}: ProfessionalDocumentSectionProps) {
    const inputId = useId();
    const [applied, setApplied] = useState(documentNumber);
    const [value, setValue] = useState(documentNumber ?? '');

    // Adjust state during render (react-hooks/set-state-in-effect), not an Effect.
    if (documentNumber !== applied) {
        setApplied(documentNumber);
        setValue(documentNumber ?? '');
    }

    const { mutate, isPending } = useUpdateProfessionalDocument();
    const typed = value.replace(/[\s.]/g, '');
    const isDirty = typed !== (documentNumber ?? '');

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">Tu DNI</h2>
                <p className="text-sm text-muted-foreground">
                    Lo usamos solo para validar tus matrículas en el Buscador
                    Nacional de Profesionales de la Salud. No lo ve nadie más
                    del consultorio.
                </p>
            </div>
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
                    disabled={isPending || !isDirty}
                    onClick={() => mutate(typed === '' ? null : typed)}
                >
                    {isPending && <Spinner data-icon="inline-start" />}
                    {isPending ? 'Guardando…' : 'Guardar'}
                </Button>
            </div>
        </section>
    );
}
