import { Button } from '@/components/ui/button';
import { EmptyState } from '@/features/empty-state/EmptyState';
import type { SpecialtyCatalogUsage } from '@/types/specialty';
import { ProfessionCard } from './ProfessionCard';

type SpecialtiesCatalogProps = {
    usage: SpecialtyCatalogUsage;
    /** The search the API answered; empty when there is none. */
    query: string;
    onClearSearch: () => void;
};

/** The catalog grouped by profession, or why there is nothing to show. */
export function SpecialtiesCatalog({
    usage,
    query,
    onClearSearch,
}: SpecialtiesCatalogProps) {
    if (usage.professions.length === 0 && query !== '') {
        return (
            <EmptyState
                illustration="search"
                title="Sin resultados"
                description="Ninguna profesión ni especialidad contiene ese texto."
                action={
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClearSearch}
                    >
                        Limpiar búsqueda
                    </Button>
                }
            />
        );
    }

    if (usage.professions.length === 0) {
        return (
            <EmptyState
                illustration="records"
                title="Todavía no hay especialidades"
                description="El catálogo se llena con lo que responde el registro nacional de profesionales cuando un profesional carga su DNI."
            />
        );
    }

    return (
        <div className="space-y-6">
            {usage.professions.map((profession) => (
                <ProfessionCard
                    key={profession.profession}
                    profession={profession}
                    query={query}
                />
            ))}
        </div>
    );
}
