import { DataTablePagination } from '@/components/DataTablePagination';
import { TableSkeleton } from '@/components/TableSkeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/features/empty-state/EmptyState';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { FilterSelect } from '@/features/filter-select/FilterSelect';
import { CONTACT_REQUEST_STATUS_LABELS } from '@/lib/labels';
import { titleHead } from '@/lib/page-title';
import {
    CONTACT_REQUEST_STATUSES,
    type ContactRequestStatus,
} from '@/types/contact-request';
import { createFileRoute } from '@tanstack/react-router';
import { useRef } from 'react';
import { z } from 'zod';
import { ContactRequestsTable } from './-components/ContactRequestsTable';
import { contactRequestsQueryOptions } from './-hooks/use-contact-requests';

const STATUS_OPTIONS = CONTACT_REQUEST_STATUSES.map((status) => ({
    value: status,
    label: CONTACT_REQUEST_STATUS_LABELS[status],
}));

const contactRequestsSearchSchema = z.object({
    status: z.enum(CONTACT_REQUEST_STATUSES).optional().catch(undefined),
    page: z.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/contactos/')({
    head: () => titleHead('Contactos'),
    validateSearch: (search) => contactRequestsSearchSchema.parse(search),
    loaderDeps: ({ search }) => ({
        status: search.status,
        page: search.page ?? 1,
    }),
    loader: ({ context, deps }) =>
        context.queryClient.ensureQueryData(contactRequestsQueryOptions(deps)),
    pendingComponent: () => <TableSkeleton columns={4} />,
    errorComponent: RouteErrorState,
    component: ContactosPage,
});

function ContactosPage() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const data = Route.useLoaderData();
    const headingRef = useRef<HTMLHeadingElement>(null);
    const isListed = (status: ContactRequestStatus) =>
        search.status === undefined || search.status === status;

    const empty =
        search.status !== undefined ? (
            <EmptyState
                illustration="search"
                title="Sin resultados"
                description="No hay consultas con ese estado."
                action={
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            void navigate({ search: {}, replace: true })
                        }
                    >
                        Limpiar filtros
                    </Button>
                }
            />
        ) : (
            <EmptyState
                illustration="inbox"
                title="Todavía no hay consultas"
                description="Aparecen acá cuando alguien escribe desde el formulario de contacto de la landing."
            />
        );

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-2xl tracking-tight outline-none"
                >
                    Contactos
                </h1>
                <p className="text-sm text-muted-foreground">
                    Consultas comerciales de la landing. Se responden por correo
                    o teléfono; acá se lleva su estado.
                </p>
            </div>
            <div className="flex flex-wrap items-end gap-4">
                <FilterSelect
                    label="Estado"
                    value={search.status}
                    options={STATUS_OPTIONS}
                    allLabel="Todos"
                    onChange={(status) =>
                        void navigate({
                            search: { status, page: undefined },
                            replace: true,
                        })
                    }
                />
            </div>
            <ContactRequestsTable
                contactRequests={data.data}
                empty={empty}
                isListed={isListed}
                fallbackFocus={headingRef}
            />
            <DataTablePagination
                currentPage={data.meta.current_page}
                lastPage={data.meta.last_page}
                total={data.meta.total}
                label="consultas"
                onPageChange={(page) =>
                    void navigate({ search: (prev) => ({ ...prev, page }) })
                }
            />
        </div>
    );
}
