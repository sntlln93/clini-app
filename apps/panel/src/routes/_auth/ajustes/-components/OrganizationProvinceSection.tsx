import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { PROVINCES } from '@/lib/provinces';
import { useState } from 'react';
import { useUpdateOrganizationProvince } from '../-hooks/use-organization-province';
import { OptionPicker } from './OptionPicker';

type OrganizationProvinceSectionProps = {
    province: string | null;
};

// Where the practice attends (#380): which license of each professional
// counts here, and which provincial holidays close the booking page.
export function OrganizationProvinceSection({
    province,
}: OrganizationProvinceSectionProps) {
    const [applied, setApplied] = useState(province);
    const [selected, setSelected] = useState(province);

    // Adjust state during render (react-hooks/set-state-in-effect), not an Effect.
    if (province !== applied) {
        setApplied(province);
        setSelected(province);
    }

    const { mutate, isPending } = useUpdateOrganizationProvince();

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">Provincia</h2>
                <p className="text-sm text-muted-foreground">
                    Dónde atiende el consultorio. Define qué matrícula de cada
                    profesional vale acá y qué feriados provinciales cierran la
                    página de reservas.
                </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
                <OptionPicker
                    className="min-w-48 flex-1 space-y-1"
                    label="Provincia del consultorio"
                    placeholder="Elegí la provincia"
                    items={PROVINCES}
                    value={selected}
                    onChange={setSelected}
                />
                <Button
                    type="button"
                    size="sm"
                    disabled={
                        isPending || selected === null || selected === province
                    }
                    onClick={() => selected !== null && mutate(selected)}
                >
                    {isPending && <Spinner data-icon="inline-start" />}
                    {isPending ? 'Guardando…' : 'Guardar'}
                </Button>
            </div>
        </section>
    );
}
