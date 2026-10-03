import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { createFileRoute } from '@tanstack/react-router';
import { PrescriptionPrintView } from './-components/PrescriptionPrintView';
import { prescriptionQueryOptions } from './-hooks/use-prescription';

// Printable view of one prescription (issue #31). The panel chrome is hidden
// on print by `PanelLayout`, so only the document reaches the paper.
export const Route = createFileRoute('/_auth/recetas/$id')({
    params: {
        parse: (rawParams) => ({ id: Number(rawParams.id) }),
    },
    loader: ({ context, params }) =>
        context.queryClient.ensureQueryData(
            prescriptionQueryOptions(params.id),
        ),
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: RecetaPage,
});

function RecetaPage() {
    return <PrescriptionPrintView prescription={Route.useLoaderData()} />;
}
