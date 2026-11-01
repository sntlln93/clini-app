// The regulatory marks of a catalog product (#377), as the Buscador Nacional
// de Medicamentos writes them: its dispensing condition («Venta Bajo Receta
// Archivada») and its control mark («PSICOTROPICO IV»), null when it isn't
// controlled. They are shown, never enforced: that is the prescription's (#314).
export type MedicationMarks = {
    dispensing_condition: string | null;
    control_mark: string | null;
};

// One product of the medication catalog, filled on demand from the Buscador
// Nacional de Medicamentos (#377): everything picking it needs, with no second
// request. `drug` is the source's text («ergotamina+cafeína+asoc.»);
// `substances` are the ones it names, written out («ácido clavulánico»), which
// the allergy warning compares, and `composition_incomplete` says the source
// cut that list short.
export type MedicationProduct = MedicationMarks & {
    gtin: string;
    name: string;
    presentation: string | null;
    pharmaceutical_form: string | null;
    administration_route: string | null;
    laboratory: string | null;
    drug: string | null;
    therapeutic_action: string | null;
    substances: string[];
    composition_incomplete: boolean;
};

// The catalog product an item of the medication form was picked from: what
// the form shows about it and sends (its GTIN). An amendment rebuilds it from
// the item's snapshot.
export type PickedMedication = MedicationMarks & {
    gtin: string;
    substances: string[];
    composition_incomplete: boolean;
};
