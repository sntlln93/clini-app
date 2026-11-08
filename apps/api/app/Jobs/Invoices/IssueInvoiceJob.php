<?php

declare(strict_types=1);

namespace App\Jobs\Invoices;

use App\Actions\Invoices\IssueInvoiceAction;
use App\Data\Invoices\InvoiceIssuanceData;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Issues one pending invoice (#246, ADR 0039), queued after the webhook that
 * recorded it commits: the subscription never waits on ARCA, nor fails with
 * it. ARCA failing is retried with backoff, and `invoices:issue-pending`
 * queues again whatever is still pending after that. Unique per invoice, so
 * that sweep never stacks a second one behind a job still retrying; the
 * action is idempotent either way.
 */
final class IssueInvoiceJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, Queueable;

    public int $tries = 6;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900, 3600, 3600];

    /** Seconds the uniqueness holds even if a worker dies mid-job. */
    public int $uniqueFor = 21600;

    public function __construct(
        public readonly int $invoiceId,
    ) {
        $this->afterCommit();
    }

    public function uniqueId(): string
    {
        return (string) $this->invoiceId;
    }

    public function handle(IssueInvoiceAction $action): void
    {
        $action->handle(new InvoiceIssuanceData($this->invoiceId));
    }

    /**
     * The invoice stays pending; the hourly sweep queues it again. Ids and
     * the exception's class only (#322).
     */
    public function failed(?Throwable $exception): void
    {
        Log::error('An invoice could not be issued after every retry; it stays pending.', [
            'invoice_id' => $this->invoiceId,
            'exception' => $exception !== null ? $exception::class : null,
        ]);
    }
}
