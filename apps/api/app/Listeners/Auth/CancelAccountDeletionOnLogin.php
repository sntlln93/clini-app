<?php

declare(strict_types=1);

namespace App\Listeners\Auth;

use App\Actions\Account\CancelAccountDeletionAction;
use App\Data\Account\AccountDeletionCancellationData;
use App\Models\User;
use Illuminate\Auth\Events\Login;
use Illuminate\Http\Request;

/**
 * Any completed clinic login cancels a pending account deletion (#384, ADR 0034): the password one, its second step,
 * and the invitation and email verification ones, which skip `login()` while a second factor is on. Leaves a flag on
 * the request, so the session payload tells the panel.
 */
final readonly class CancelAccountDeletionOnLogin
{
    public const string CANCELLED_ATTRIBUTE = 'account_deletion_cancelled';

    public function __construct(
        private CancelAccountDeletionAction $cancel,
        private Request $request,
    ) {}

    public function handle(Login $event): void
    {
        if ($event->guard !== 'web' || ! $event->user instanceof User) {
            return;
        }

        if ($this->cancel->handle(new AccountDeletionCancellationData($event->user))) {
            $this->request->attributes->set(self::CANCELLED_ATTRIBUTE, true);
        }
    }
}
