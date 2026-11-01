/**
 * The 24 jurisdictions, mirroring `App\Enums\Province` (value = its slug,
 * label = its `label()`); `province-parity.test.ts` keeps them in sync.
 */
export const PROVINCES = [
    { value: 'buenos-aires', label: 'Buenos Aires' },
    { value: 'caba', label: 'Ciudad Autónoma de Buenos Aires' },
    { value: 'catamarca', label: 'Catamarca' },
    { value: 'chaco', label: 'Chaco' },
    { value: 'chubut', label: 'Chubut' },
    { value: 'cordoba', label: 'Córdoba' },
    { value: 'corrientes', label: 'Corrientes' },
    { value: 'entre-rios', label: 'Entre Ríos' },
    { value: 'formosa', label: 'Formosa' },
    { value: 'jujuy', label: 'Jujuy' },
    { value: 'la-pampa', label: 'La Pampa' },
    { value: 'la-rioja', label: 'La Rioja' },
    { value: 'mendoza', label: 'Mendoza' },
    { value: 'misiones', label: 'Misiones' },
    { value: 'neuquen', label: 'Neuquén' },
    { value: 'rio-negro', label: 'Río Negro' },
    { value: 'salta', label: 'Salta' },
    { value: 'san-juan', label: 'San Juan' },
    { value: 'san-luis', label: 'San Luis' },
    { value: 'santa-cruz', label: 'Santa Cruz' },
    { value: 'santa-fe', label: 'Santa Fe' },
    { value: 'santiago-del-estero', label: 'Santiago del Estero' },
    { value: 'tierra-del-fuego', label: 'Tierra del Fuego' },
    { value: 'tucuman', label: 'Tucumán' },
] as const;

export type Province = (typeof PROVINCES)[number]['value'];

export function provinceLabel(province: string): string {
    return (
        PROVINCES.find((option) => option.value === province)?.label ?? province
    );
}
