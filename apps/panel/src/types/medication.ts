// One active ingredient of a catalog product (#377), as ANMAT lists it, with
// the substance it is.
export type MedicationIngredient = {
    name: string;
    substance: string;
    quantity: string | null;
    unit: string | null;
};

// One product of the medication catalog, filled on demand from the national
// vademecum (#377). `ingredients` is null until its detail arrives.
export type MedicationProduct = {
    gtin: string;
    commercial_name: string;
    pharmaceutical_form: string;
    presentation: string;
    generic_name: string;
    laboratory: string;
    certificate_number: string;
    ingredients: MedicationIngredient[] | null;
};
