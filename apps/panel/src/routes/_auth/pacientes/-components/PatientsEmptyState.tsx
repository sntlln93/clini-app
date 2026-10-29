import { Button } from '@/components/ui/button';
import { EmptyState } from '@/features/empty-state/EmptyState';
import { Link } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';

type PatientsEmptyStateProps = {
    searching: boolean;
    onClearSearch: () => void;
};

export function PatientsEmptyState({
    searching,
    onClearSearch,
}: PatientsEmptyStateProps) {
    return searching ? (
        <EmptyState
            illustration="search"
            title="Sin resultados"
            description="No encontramos pacientes que coincidan con la búsqueda."
            action={
                <Button type="button" variant="outline" onClick={onClearSearch}>
                    Limpiar búsqueda
                </Button>
            }
        />
    ) : (
        <EmptyState
            illustration="patients"
            title="Todavía no hay pacientes"
            description="Cargá el primer paciente para empezar a agendar turnos."
            action={
                <Button
                    render={<Link to="/pacientes/nuevo" />}
                    nativeButton={false}
                >
                    <UserPlus data-icon="inline-start" />
                    Nuevo paciente
                </Button>
            }
        />
    );
}
