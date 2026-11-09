import { DataTable } from '@/components/DataTable';
import type { Invoice } from '@/types/invoice';
import { useInvoiceDownload } from '../-hooks/use-invoice-download';
import { invoiceColumns } from './invoice-columns';

type InvoicesSectionProps = {
    invoices: Invoice[];
};

/**
 * The subscription's invoices (#246), for the owner who pays it: one factura
 * C per charge, authorized by ARCA, each downloadable as a PDF built here.
 */
export function InvoicesSection({ invoices }: InvoicesSectionProps) {
    const { mutate, isPending, variables } = useInvoiceDownload();
    const columns = invoiceColumns({
        download: mutate,
        downloadingId: isPending && variables ? variables.id : null,
    });

    return (
        <section aria-labelledby="facturas-title" className="space-y-3">
            <div className="space-y-1">
                <h2 id="facturas-title" className="text-sm font-medium">
                    Facturas
                </h2>
                <p className="text-sm text-muted-foreground">
                    Cada cobro de la suscripción tiene su factura C electrónica,
                    autorizada por ARCA. Te avisamos por correo cuando se emite.
                </p>
            </div>
            <DataTable
                columns={columns}
                data={invoices}
                empty={
                    <p className="text-sm text-muted-foreground">
                        Todavía no hay facturas: la primera llega con el primer
                        cobro de la suscripción.
                    </p>
                }
            />
        </section>
    );
}
