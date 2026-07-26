import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { PatientsTable } from './-components/PatientsTable';
import { usePatients } from './-hooks/use-patients';

export const Route = createFileRoute('/_auth/pacientes/')({
    component: PacientesPage,
});

function PacientesPage() {
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const { data, isPending } = usePatients({ q, page });

    function handleSearchChange(value: string) {
        setQ(value);
        setPage(1);
    }

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

            {isPending && (
                <p className="text-sm text-muted-foreground">Cargando…</p>
            )}

            {!isPending && data && data.data.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    No se encontraron pacientes.
                </p>
            )}

            {!isPending && data && data.data.length > 0 && (
                <>
                    <div className="overflow-auto rounded-md border">
                        <PatientsTable patients={data.data} />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground">
                            Página {data.meta.current_page} de{' '}
                            {data.meta.last_page} ({data.meta.total} pacientes)
                        </p>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={data.meta.current_page <= 1}
                                onClick={() =>
                                    setPage((current) =>
                                        Math.max(1, current - 1),
                                    )
                                }
                            >
                                Anterior
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={
                                    data.meta.current_page >=
                                    data.meta.last_page
                                }
                                onClick={() =>
                                    setPage((current) => current + 1)
                                }
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
