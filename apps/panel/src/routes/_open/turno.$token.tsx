import { CardSkeleton } from '@/components/CardSkeleton';
import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { AppointmentDetails } from './-components/booking/AppointmentDetails';
import {
    BookingLogo,
    MadeWithClini,
} from './-components/booking/BookingBranding';
import { AppointmentDetailsErrorState } from './-components/booking/BookingErrorState';
import { appointmentDetailsQueryOptions } from './-hooks/use-public-booking';

// The link the reminder mail carries (#320): the token is its only credential.
export const Route = createFileRoute('/_open/turno/$token')({
    loader: ({ context, params }) =>
        context.queryClient.ensureQueryData(
            appointmentDetailsQueryOptions(params.token),
        ),
    head: ({ loaderData }) =>
        titleHead('Tu turno', loaderData?.organization.name),
    pendingComponent: () => <CardSkeleton className="max-w-md" />,
    errorComponent: AppointmentDetailsErrorState,
    component: AppointmentPage,
});

function AppointmentPage() {
    const details = Route.useLoaderData();

    return (
        <div className="w-full max-w-md space-y-6">
            <BookingLogo organization={details.organization} />
            <AppointmentDetails {...details} />
            {details.organization.show_clini_mark && <MadeWithClini />}
        </div>
    );
}
