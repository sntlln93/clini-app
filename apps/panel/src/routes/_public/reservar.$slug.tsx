import { RouteErrorState } from '@/components/RouteErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { BookingWizard } from './-components/booking/BookingWizard';
import {
    bookingOrganizationQueryOptions,
    bookingSlotsQueryOptions,
} from './-hooks/use-public-booking';

const bookingSearchSchema = z.object({
    specialty: z.coerce.number().optional(),
    professional: z.coerce.number().optional(),
    service: z.coerce.number().optional(),
    date: z.string().optional(),
});

export const Route = createFileRoute('/_public/reservar/$slug')({
    validateSearch: (search) => bookingSearchSchema.parse(search),
    // A membership slug reports the professional to preselect via
    // `preselected_membership_id` (#32). Request state stays in the URL
    // (ADR: request state lives in the URL), so it is resolved with a
    // redirect into `search.professional` here, not local state.
    beforeLoad: async ({ context, params, search }) => {
        const organization = await context.queryClient.ensureQueryData(
            bookingOrganizationQueryOptions(params.slug),
        );

        if (
            organization.preselected_membership_id !== null &&
            search.professional === undefined
        ) {
            throw redirect({
                to: '/reservar/$slug',
                params,
                search: {
                    ...search,
                    professional: organization.preselected_membership_id,
                },
            });
        }
    },
    loaderDeps: ({ search }) => ({
        professional: search.professional,
        service: search.service,
        date: search.date,
    }),
    loader: async ({ context, params, deps }) => {
        const organization = await context.queryClient.ensureQueryData(
            bookingOrganizationQueryOptions(params.slug),
        );

        const slots =
            deps.professional && deps.service && deps.date
                ? await context.queryClient.ensureQueryData(
                      bookingSlotsQueryOptions({
                          slug: params.slug,
                          membershipId: deps.professional,
                          serviceId: deps.service,
                          from: deps.date,
                          to: deps.date,
                      }),
                  )
                : [];

        return { organization, slots };
    },
    pendingComponent: () => (
        <div className="w-full max-w-md space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
        </div>
    ),
    errorComponent: RouteErrorState,
    component: BookingPage,
});

function BookingPage() {
    const { slug } = Route.useParams();
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const { organization, slots } = Route.useLoaderData();

    return (
        <div className="w-full max-w-md">
            <BookingWizard
                slug={slug}
                organization={organization.organization}
                professionals={organization.professionals}
                slots={slots}
                search={search}
                onSearchChange={(next) =>
                    void navigate({ search: (prev) => ({ ...prev, ...next }) })
                }
            />
        </div>
    );
}
