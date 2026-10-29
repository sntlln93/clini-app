import { Button } from '@/components/ui/button';
import { EmptyState } from '@/features/empty-state/EmptyState';
import { Link } from '@tanstack/react-router';
import { MailPlus } from 'lucide-react';

type MembersEmptyStateProps = {
    searching: boolean;
    onClearSearch: () => void;
};

export function MembersEmptyState({
    searching,
    onClearSearch,
}: MembersEmptyStateProps) {
    return searching ? (
        <EmptyState
            illustration="search"
            title="Sin resultados"
            description="No encontramos miembros que coincidan con la búsqueda."
            action={
                <Button type="button" variant="outline" onClick={onClearSearch}>
                    Limpiar búsqueda
                </Button>
            }
        />
    ) : (
        <EmptyState
            illustration="team"
            title="Todavía no hay miembros"
            description="Invitá a alguien de tu equipo para que pueda acceder al panel."
            action={
                <Button
                    render={<Link to="/profesionales/nuevo" />}
                    nativeButton={false}
                >
                    <MailPlus data-icon="inline-start" />
                    Invitar miembro
                </Button>
            }
        />
    );
}
