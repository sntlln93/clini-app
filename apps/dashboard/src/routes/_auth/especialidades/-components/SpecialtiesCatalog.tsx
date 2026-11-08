import { EmptyState } from '@/features/empty-state/EmptyState';
import type { SpecialtyCatalogUsage } from '@/types/specialty';
import { ProfessionCard } from './ProfessionCard';

/** The catalog grouped by profession, or how it gets filled while empty. */
export function SpecialtiesCatalog({
    usage,
}: {
    usage: SpecialtyCatalogUsage;
}) {
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
                />
            ))}
        </div>
    );
}
