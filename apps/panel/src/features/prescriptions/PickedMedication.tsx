import type { PickedMedication as Picked } from '@/types/medication';
import { MedicationMarks } from './MedicationMarks';

// «Principio activo: ergotamina + cafeína y otros que el Buscador no detalla».
function composition(catalog: Picked): string {
    const substances = catalog.substances.join(' + ');
    if (substances === '') {
        return '';
    }

    return catalog.composition_incomplete
        ? ` · Principio activo: ${substances} y otros que el Buscador no detalla`
        : ` · Principio activo: ${substances}`;
}

// What the item took from the catalog product it was picked from (#377): the
// substances the allergy warning compares and the product's marks.
export function PickedMedication({ catalog }: { catalog: Picked }) {
    return (
        <div className="space-y-1">
            <p className="text-sm wrap-break-word text-muted-foreground">
                Del Buscador Nacional de Medicamentos
                {composition(catalog)}
            </p>
            <MedicationMarks marks={catalog} />
        </div>
    );
}
