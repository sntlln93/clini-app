<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Admin\AdminAuditEntryData;
use App\Data\Admin\UserBlockingData;
use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Exceptions\Users\UserAlreadyBlockedException;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Blocks a clinic user: clinic login is rejected and an open panel session
 * is logged out on its next guarded request (EnsureUserNotBlocked). Session
 * rows are deliberately not deleted — `sessions.user_id` is not reliable for
 * that (ADR 0010).
 *
 * @implements Action<UserBlockingData>
 */
class BlockUserAction implements Action
{
    public function __construct(
        private readonly RecordAdminAuditAction $recordAudit,
    ) {}

    /**
     * @param  UserBlockingData  $dto
     */
    public function handle(Data $dto): User
    {
        return DB::transaction(function () use ($dto): User {
            $user = User::query()->lockForUpdate()->findOrFail($dto->userId);

            if ($user->blocked_at !== null) {
                throw new UserAlreadyBlockedException($user->id);
            }

            $user->forceFill([
                'blocked_at' => now(),
                'block_reason' => $dto->reason,
            ])->save();

            $this->recordAudit->handle(new AdminAuditEntryData(
                actor: $dto->actor,
                action: AdminAuditAction::UserBlocked,
                subjectType: AdminAuditSubject::User,
                subjectId: $user->id,
                metadata: [
                    'subject_label' => $user->email,
                    'reason' => $dto->reason,
                ],
            ));

            return $user;
        });
    }
}
