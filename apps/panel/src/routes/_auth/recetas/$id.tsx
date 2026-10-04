import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { titleHead } from '@/lib/page-title';
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
    // Also the suggested file name when printing the prescription to PDF.
    head: ({ loaderData }) => titleHead('Receta', loaderData?.patient_name),
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: RecetaPage,
});

function RecetaPage() {
    return <PrescriptionPrintView prescription={Route.useLoaderData()} />;
}
