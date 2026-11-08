import { StatusPill } from '@/components/StatusPill';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatInvoiceDate } from '@/lib/invoices';
import { formatPriceCents } from '@/lib/price';
import type { Invoice } from '@/types/invoice';
import type { ColumnDef } from '@tanstack/react-table';
import { DownloadIcon } from 'lucide-react';

type DownloadState = {
    download: (invoice: Invoice) => void;
    /** The invoice whose PDF is being drawn, if any. */
    downloadingId: number | null;
};

function DownloadButton({
    invoice,
    download,
    downloadingId,
}: DownloadState & { invoice: Invoice }) {
    if (!invoice.voucher) {
        return null;
    }

    const downloading = downloadingId === invoice.id;

    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={downloadingId !== null}
            onClick={() => download(invoice)}
            aria-label={`Descargar la factura ${invoice.voucher.formatted_number}`}
        >
            {downloading ? (
                <Spinner data-icon="inline-start" aria-hidden />
            ) : (
                <DownloadIcon data-icon="inline-start" aria-hidden />
            )}
            PDF
        </Button>
    );
}

/** The invoices table's columns: voucher, date, period, total and its PDF. */
export function invoiceColumns(state: DownloadState): ColumnDef<Invoice>[] {
    return [
        {
            id: 'voucher',
            header: 'Comprobante',
            cell: ({ row }) =>
                row.original.voucher ? (
                    <span className="whitespace-nowrap tabular-nums">
                        Factura {row.original.voucher.formatted_number}
                    </span>
                ) : (
                    <StatusPill tone="info">En emisión</StatusPill>
                ),
        },
        {
            id: 'date',
            header: 'Fecha',
            meta: { className: 'tabular-nums' },
            cell: ({ row }) =>
                row.original.voucher
                    ? formatInvoiceDate(row.original.voucher.issued_on)
                    : '—',
        },
        {
            id: 'period',
            header: 'Período',
            meta: { className: 'tabular-nums whitespace-nowrap' },
            cell: ({ row }) =>
                `${formatInvoiceDate(row.original.service_from)} al ${formatInvoiceDate(row.original.service_to)}`,
        },
        {
            id: 'amount',
            header: 'Importe',
            meta: { className: 'text-right tabular-nums whitespace-nowrap' },
            cell: ({ row }) => formatPriceCents(row.original.amount_cents),
        },
        {
            id: 'download',
            header: () => <span className="sr-only">Descargar</span>,
            meta: { className: 'text-right' },
            cell: ({ row }) => (
                <DownloadButton invoice={row.original} {...state} />
            ),
        },
    ];
}
