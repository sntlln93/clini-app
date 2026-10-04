import { CardSkeleton } from '@/components/CardSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { todayInTimeZone } from '@/lib/iso-date';
import { titleHead } from '@/lib/page-title';
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

export const Route = createFileRoute('/_open/reservar/$slug')({
    validateSearch: (search) => bookingSearchSchema.parse(search),
    // `preselected_membership_id` resolves via a redirect into `search.professional`, and the slot step's default day into `search.date`, not local state, since request state lives in the URL.
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

        // The slot step opens on the practice's today, and a stale past day from an old link snaps forward to it.
        const today = todayInTimeZone(organization.organization.timezone);
        if (
            search.professional !== undefined &&
            search.service !== undefined &&
            (search.date === undefined || search.date < today)
        ) {
            throw redirect({
                to: '/reservar/$slug',
                params,
                search: { ...search, date: today },
                replace: true,
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
    head: ({ loaderData }) =>
        titleHead('Reservar turno', loaderData?.organization.organization.name),
    pendingComponent: () => <CardSkeleton className="max-w-md" />,
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
