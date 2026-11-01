<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Account\CompleteAccountDeletionAction;
use App\Data\Account\AccountDeletionCompletionData;
use App\Models\AccountDeletionRequest;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Throwable;

/**
 * Each request in its own transaction, so one that fails is retried on the next run without holding the rest (#384).
 */
#[Description('Deletes the accounts whose deletion grace period has ended')]
#[Signature('accounts:complete-deletions')]
class CompleteAccountDeletionsCommand extends Command
{
    public function handle(CompleteAccountDeletionAction $action): int
    {
        $requests = AccountDeletionRequest::query()
            ->pending()
            ->where('deletes_at', '<=', now())
            ->orderBy('deletes_at')
            ->get(['id']);

        foreach ($requests as $request) {
            try {
                $action->handle(new AccountDeletionCompletionData($request->id));
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        return self::SUCCESS;
    }
}
