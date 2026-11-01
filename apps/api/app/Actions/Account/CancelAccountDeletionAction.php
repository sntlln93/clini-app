<?php

declare(strict_types=1);

namespace App\Actions\Account;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Account\AccountDeletionCancellationData;
use App\Enums\AccountDeletionStatus;
use App\Models\AccountDeletionRequest;
use App\Support\AccountDeletionRules;
use Illuminate\Support\Facades\DB;

/**
 * A completed login within the grace period cancels the user's pending account deletion (#384, ADR 0034) and puts
 * back exactly the memberships it deactivated, with their roles; the ones that were already inactive stay so. Answers
 * whether there was one to cancel.
 *
 * @implements Action<AccountDeletionCancellationData>
 */
class CancelAccountDeletionAction implements Action
{
    /**
     * @param  AccountDeletionCancellationData  $dto
     */
    public function handle(Data $dto): bool
    {
        return DB::transaction(function () use ($dto): bool {
            $request = AccountDeletionRequest::query()
                ->pending()
                ->where('user_id', $dto->user->id)
                ->lockForUpdate()
                ->first();

            if ($request === null) {
                return false;
            }

            AccountDeletionRules::restoreMemberships($request);

            $request->update([
                'status' => AccountDeletionStatus::Cancelled,
                'resolved_at' => now(),
            ]);

            return true;
        });
    }
}
