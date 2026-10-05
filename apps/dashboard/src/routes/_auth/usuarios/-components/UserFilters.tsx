import { FilterSelect } from '@/features/filter-select/FilterSelect';
import { Searchbar } from '@/features/Searchbar';

export type BooleanFilter = 'true' | 'false';

export type UserFilterValues = {
    q: string;
    verified?: BooleanFilter;
    blocked?: BooleanFilter;
};

const VERIFIED_OPTIONS = [
    { value: 'true', label: 'Verificados' },
    { value: 'false', label: 'Sin verificar' },
] as const;

const BLOCKED_OPTIONS = [
    { value: 'false', label: 'Con acceso' },
    { value: 'true', label: 'Bloqueados' },
] as const;

type UserFiltersProps = {
    values: UserFilterValues;
    onChange: (patch: Partial<UserFilterValues>) => void;
};

export function UserFilters({ values, onChange }: UserFiltersProps) {
    return (
        <div className="flex flex-wrap items-end gap-4">
            <Searchbar
                value={values.q}
                onSearch={(q) => onChange({ q })}
                placeholder="Buscar por nombre o correo…"
                label="Buscar usuarios"
                className="max-w-sm"
            />
            <FilterSelect
                label="Verificación"
                value={values.verified}
                options={VERIFIED_OPTIONS}
                allLabel="Todos"
                onChange={(verified) => onChange({ verified })}
            />
            <FilterSelect
                label="Acceso"
                value={values.blocked}
                options={BLOCKED_OPTIONS}
                allLabel="Todos"
                onChange={(blocked) => onChange({ blocked })}
            />
        </div>
    );
}
