import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { PlanFeatureNote } from '@/features/plan-feature-note/PlanFeatureNote';
import { SEARCH_DEBOUNCE_MS } from '@/features/Searchbar';
import { ensureScopedProfessionals } from '@/hooks/use-professionals';
import { isCalendarDate, todayInTimeZone } from '@/lib/iso-date';
import { titleHead } from '@/lib/page-title';
import { planIncludes, planQueryOptions } from '@/lib/plan';
import { sessionHasPermission, sessionQueryOptions } from '@/lib/session';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { effectiveRangeError } from './-components/report-range';
import type { ReportFilterValues } from './-components/ReportFilters';
import { ReportView } from './-components/ReportView';
import { reportQueryOptions } from './-hooks/use-report';

const ymd = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => isCalendarDate(value));

// All optional: an omitted filter is the API's default, shown back from `period`.
// A range the API would reject falls back to that default instead of an error page with no filters to fix it.
const reportSearchSchema = z
    .object({
        from: ymd.optional().catch(undefined),
        to: ymd.optional().catch(undefined),
        granularity: z.enum(['week', 'month']).optional().catch(undefined),
        membershipId: z.coerce
            .number()
            .int()
            .min(1)
            .optional()
            .catch(undefined),
    })
    .transform((search) =>
        // On the very first load this runs before `_auth` sets the practice's zone, so today may be the browser's; the API checks the range again in the practice's.
        effectiveRangeError(search, todayInTimeZone()) === null
            ? search
            : { ...search, from: undefined, to: undefined },
    );

export const Route = createFileRoute('/_auth/reportes/')({
    head: () => titleHead('Reportes'),
    validateSearch: (search) => reportSearchSchema.parse(search),
    loaderDeps: ({ search }) => search,
    loader: async ({ context, deps }) => {
        // A plan without reports (anything but Center) gets an explanation
        // instead of a read the API would reject (#242).
        const plan =
            await context.queryClient.ensureQueryData(planQueryOptions);

        if (!planIncludes(plan, 'reports')) {
            return { available: false as const };
        }

        const session =
            await context.queryClient.ensureQueryData(sessionQueryOptions);
        const canViewAll = sessionHasPermission(session, 'reports.view');
        const professionals = canViewAll
            ? await ensureScopedProfessionals(context.queryClient)
            : [];
        // `reports.view.own` only reads one's own report, so it is always the one requested; with neither permission the API answers 403.
        const membershipId = canViewAll
            ? professionals.find(
                  (professional) => professional.id === deps.membershipId,
              )?.id
            : sessionHasPermission(session, 'reports.view.own')
              ? session.membership?.id
              : undefined;

        const report = await context.queryClient.ensureQueryData(
            reportQueryOptions({
                from: deps.from,
                to: deps.to,
                granularity: deps.granularity,
                membership_id: membershipId,
            }),
        );

        return {
            available: true as const,
            report,
            professionals,
            membershipId,
        };
    },
    // Paired with the filters' debounced commits (`useDateRangeDraft`), so a filter edit doesn't swap the page for its skeleton at once.
    pendingMs: SEARCH_DEBOUNCE_MS,
    pendingComponent: () => <ListSkeleton rows={4} />,
    errorComponent: RouteErrorState,
    component: ReportesPage,
});

function ReportesPage() {
    const data = Route.useLoaderData();
    const navigate = Route.useNavigate();

    if (!data.available) {
        return (
            <div className="space-y-4">
                <h1 className="text-3xl tracking-tight">Reportes</h1>
                <PlanFeatureNote>
                    Los reportes de ocupación y ausentismo por profesional son
                    parte del plan Centro.
                </PlanFeatureNote>
            </div>
        );
    }

    function handleFiltersChange(patch: ReportFilterValues) {
        void navigate({
            search: (prev) => ({ ...prev, ...patch }),
            replace: true,
        });
    }

    return (
        <ReportView
            report={data.report}
            professionals={data.professionals}
            membershipId={data.membershipId}
            onFiltersChange={handleFiltersChange}
        />
    );
}
