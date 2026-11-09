<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\InvoiceStatus;
use App\Jobs\Invoices\IssueInvoiceJob;
use App\Models\Invoice;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Queues again every invoice still pending once its own job had time to
 * retry (#246, ADR 0039): ARCA down for longer than the job's backoff, a
 * ticket WSAA won't renew yet, or the issuer not configured when the charge
 * arrived. The job is unique per invoice, so one still retrying is left alone.
 */
#[Description('Queues the issuance of every invoice still pending')]
#[Signature('invoices:issue-pending')]
class IssuePendingInvoicesCommand extends Command
{
    /** Older than this, an invoice's first job has had its retries. */
    public const int GRACE_MINUTES = 180;

    public function handle(): int
    {
        $pending = Invoice::withoutGlobalScope('organization')
            ->where('status', InvoiceStatus::Pending)
            ->where('created_at', '<=', now()->subMinutes(self::GRACE_MINUTES))
            ->orderBy('id')
            ->get(['id']);

        foreach ($pending as $invoice) {
            IssueInvoiceJob::dispatch($invoice->id);
        }

        return self::SUCCESS;
    }
}
