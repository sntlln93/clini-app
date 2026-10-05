<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Admin\AdminAuditEntryData;
use App\Data\Admin\ManualEmailVerificationData;
use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Exceptions\Users\EmailAlreadyVerifiedException;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Marks a user's email as verified on an operator's behalf, clearing any
 * pending verification token so the emailed link can't be replayed.
 *
 * @implements Action<ManualEmailVerificationData>
 */
class VerifyUserEmailManuallyAction implements Action
{
    public function __construct(
        private readonly RecordAdminAuditAction $recordAudit,
    ) {}

    /**
     * @param  ManualEmailVerificationData  $dto
     */
    public function handle(Data $dto): User
    {
        return DB::transaction(function () use ($dto): User {
            $user = User::query()->lockForUpdate()->findOrFail($dto->userId);

            if ($user->email_verified_at !== null) {
                throw new EmailAlreadyVerifiedException($user->id);
            }

            $user->forceFill([
                'email_verified_at' => now(),
                'email_verification_token' => null,
                'email_verification_token_expires_at' => null,
            ])->save();

            $this->recordAudit->handle(new AdminAuditEntryData(
                actor: $dto->actor,
                action: AdminAuditAction::UserEmailVerified,
                subjectType: AdminAuditSubject::User,
                subjectId: $user->id,
                metadata: [
                    'subject_label' => $user->email,
                ],
            ));

            return $user;
        });
    }
}
