import { DataTablePagination } from '@/components/DataTablePagination';
import { EmptyState } from '@/components/EmptyState';
import { QueryErrorState } from '@/components/QueryErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, createFileRoute } from '@tanstack/react-router';
import { SearchX, Users } from 'lucide-react';
import { useState } from 'react';
import { PatientsTable } from './-components/PatientsTable';
import { usePatients } from './-hooks/use-patients';

export const Route = createFileRoute('/_auth/pacientes/')({
    component: PacientesPage,
});

function PacientesPage() {
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const { data, isPending, isError, error } = usePatients({ q, page });

    function handleSearchChange(value: string) {
        setQ(value);
        setPage(1);
    }

    function clearSearch() {
        setQ('');
        setPage(1);
    }

    const empty =
        q !== '' ? (
            <EmptyState
                icon={SearchX}
                title="Sin resultados"
                description="No encontramos pacientes que coincidan con la búsqueda."
                action={
                    <Button
                        type="button"
                        variant="outline"
                        onClick={clearSearch}
                    >
                        Limpiar búsqueda
                    </Button>
                }
            />
        ) : (
            <EmptyState
                icon={Users}
                title="Todavía no hay pacientes"
                description="Cargá el primer paciente para empezar a agendar turnos."
                action={
                    <Button
                        render={<Link to="/pacientes/nuevo" />}
                        nativeButton={false}
                    >
                        Nuevo paciente
                    </Button>
                }
            />
        );

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">Pacientes</h1>
                <Button
                    render={<Link to="/pacientes/nuevo" />}
                    nativeButton={false}
                >
                    Nuevo paciente
                </Button>
            </header>

            <Input
                placeholder="Buscar por nombre o documento…"
                value={q}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="max-w-sm"
            />

            {isError && <QueryErrorState error={error} />}

            {!isError && isPending && (
                <p className="text-sm text-muted-foreground">Cargando…</p>
            )}

            {!isError && !isPending && data && (
                <>
                    <PatientsTable patients={data.data} empty={empty} />

                    <DataTablePagination
                        currentPage={data.meta.current_page}
                        lastPage={data.meta.last_page}
                        total={data.meta.total}
                        label="pacientes"
                        onPageChange={setPage}
                    />
                </>
            )}
        </div>
    );
}
