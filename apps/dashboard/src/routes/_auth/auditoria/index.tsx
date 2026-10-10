import { DataTablePagination } from '@/components/DataTablePagination';
import { EmptyState } from '@/components/EmptyState';
import { RouteErrorState } from '@/components/RouteErrorState';
import { TableSkeleton } from '@/components/TableSkeleton';
import { Button } from '@/components/ui/button';
import { SEARCH_DEBOUNCE_MS } from '@/features/Searchbar';
import { titleHead } from '@/lib/page-title';
import { AUDIT_ACTIONS, AUDIT_SUBJECT_TYPES } from '@/types/audit';
import { createFileRoute } from '@tanstack/react-router';
import { ScrollText, SearchX } from 'lucide-react';
import { z } from 'zod';
import {
    AuditLogFilters,
    type AuditFilterValues,
} from './-components/AuditLogFilters';
import { AuditLogTable } from './-components/AuditLogTable';
import { auditLogsQueryOptions } from './-hooks/use-audit-logs';
import { platformAdminsQueryOptions } from './-hooks/use-platform-admins';

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const auditSearchSchema = z
    .object({
        action: z.enum(AUDIT_ACTIONS).optional().catch(undefined),
        platform_admin_id: z.number().int().min(1).optional().catch(undefined),
        subject_type: z.enum(AUDIT_SUBJECT_TYPES).optional().catch(undefined),
        subject_id: z.number().int().min(1).optional().catch(undefined),
        from: ymd.optional().catch(undefined),
        to: ymd.optional().catch(undefined),
        page: z.number().int().min(1).optional().catch(undefined),
    })
    // The API rejects `subject_id` without `subject_type`: drop the orphan instead of a 422 page.
    .transform((search) =>
        search.subject_type === undefined
            ? { ...search, subject_id: undefined }
            : search,
    );

export const Route = createFileRoute('/_auth/auditoria/')({
    head: () => titleHead('Auditoría'),
    validateSearch: (search) => auditSearchSchema.parse(search),
    loaderDeps: ({ search }) => ({ ...search, page: search.page ?? 1 }),
    loader: async ({ context, deps }) => {
        const [logs, admins] = await Promise.all([
            context.queryClient.ensureQueryData(auditLogsQueryOptions(deps)),
            context.queryClient.ensureQueryData(platformAdminsQueryOptions),
        ]);

        return { logs, admins };
    },
    // Paired with the filters' debounced date commits (`useDateRangeDraft`), so a date edit doesn't swap the page for its skeleton at once.
    pendingMs: SEARCH_DEBOUNCE_MS,
    pendingComponent: () => <TableSkeleton columns={6} />,
    errorComponent: RouteErrorState,
    component: AuditoriaPage,
});

function AuditoriaPage() {
    const { logs, admins } = Route.useLoaderData();
    const search = Route.useSearch();
    const navigate = Route.useNavigate();

    const filters: AuditFilterValues = {
        action: search.action,
        platform_admin_id: search.platform_admin_id,
        subject_type: search.subject_type,
        subject_id: search.subject_id,
        from: search.from,
        to: search.to,
    };
    const isFiltered = Object.values(filters).some(
        (value) => value !== undefined,
    );

    // Functional: a debounced date commit must not overwrite a filter changed in the meantime.
    function handleFiltersChange(patch: Partial<AuditFilterValues>) {
        void navigate({
            search: (prev) => ({ ...prev, ...patch, page: undefined }),
            replace: true,
        });
    }

    const empty = isFiltered ? (
        <EmptyState
            icon={SearchX}
            title="Sin resultados"
            description="No hay acciones registradas que coincidan con los filtros."
            action={
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => void navigate({ search: {}, replace: true })}
                >
                    Limpiar filtros
                </Button>
            }
        />
    ) : (
        <EmptyState
            icon={ScrollText}
            title="Sin acciones registradas"
            description="Cada inicio de sesión y cada acción de moderación de un operador queda registrada acá."
        />
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl tracking-tight">Auditoría</h1>
            <AuditLogFilters
                values={filters}
                admins={admins}
                onChange={handleFiltersChange}
            />
            <AuditLogTable logs={logs.data} empty={empty} />
            <DataTablePagination
                currentPage={logs.meta.current_page}
                lastPage={logs.meta.last_page}
                total={logs.meta.total}
                label="acciones"
                onPageChange={(page) =>
                    void navigate({ search: (prev) => ({ ...prev, page }) })
                }
            />
        </div>
    );
}
