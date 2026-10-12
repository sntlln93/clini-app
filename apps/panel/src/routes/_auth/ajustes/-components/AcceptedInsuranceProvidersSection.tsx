import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { InsuranceProvider } from '@/types/patient';
import { useId, useState } from 'react';
import { useSaveAcceptedInsuranceProviders } from '../-hooks/use-accepted-insurance-providers';

type AcceptedInsuranceProvidersSectionProps = {
    insuranceProviders: InsuranceProvider[];
    accepted: InsuranceProvider[];
};

function idsOf(providers: InsuranceProvider[]): number[] {
    return providers.map((provider) => provider.id).sort((a, b) => a - b);
}

/** Owner and admin (`organization.manage`): what the booking page offers (#291). */
export function AcceptedInsuranceProvidersSection({
    insuranceProviders,
    accepted,
}: AcceptedInsuranceProvidersSectionProps) {
    const checkboxIdPrefix = useId();
    const save = useSaveAcceptedInsuranceProviders();
    const [selected, setSelected] = useState(() => idsOf(accepted));
    const [savedFrom, setSavedFrom] = useState(accepted);

    // A saved change comes back as a new `accepted`: the draft starts over from it.
    if (savedFrom !== accepted) {
        setSavedFrom(accepted);
        setSelected(idsOf(accepted));
    }

    const dirty = selected.join(',') !== idsOf(accepted).join(',');

    function toggle(id: number, checked: boolean) {
        setSelected((current) =>
            checked
                ? [...current, id].sort((a, b) => a - b)
                : current.filter((selectedId) => selectedId !== id),
        );
    }

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">Obras sociales</h2>
                <p className="text-sm text-muted-foreground">
                    Las que atiende el consultorio. Tu página de reservas solo
                    ofrece estas, y si no marcás ninguna no le pide la obra
                    social al paciente.
                </p>
            </div>

            {insuranceProviders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Todavía no hay obras sociales en el catálogo.
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                    {insuranceProviders.map((provider) => {
                        const checkboxId = `${checkboxIdPrefix}-${provider.id}`;

                        return (
                            <div
                                key={provider.id}
                                className="flex items-center gap-2 text-sm"
                            >
                                <Checkbox
                                    id={checkboxId}
                                    checked={selected.includes(provider.id)}
                                    disabled={save.isPending}
                                    onCheckedChange={(checked) =>
                                        toggle(provider.id, checked === true)
                                    }
                                />
                                <Label htmlFor={checkboxId}>
                                    {provider.name}
                                </Label>
                            </div>
                        );
                    })}
                </div>
            )}

            {insuranceProviders.length > 0 && (
                <Button
                    type="button"
                    size="sm"
                    disabled={!dirty || save.isPending}
                    onClick={() => save.mutate(selected)}
                >
                    {save.isPending && <Spinner data-icon="inline-start" />}
                    Guardar obras sociales
                </Button>
            )}
        </section>
    );
}
