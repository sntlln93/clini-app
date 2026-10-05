<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Admin\AdminAuditEntryData;
use App\Data\Admin\UserUnblockingData;
use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Exceptions\Users\UserNotBlockedException;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Lifts a block, keeping the previous block in the audit row.
 *
 * @implements Action<UserUnblockingData>
 */
class UnblockUserAction implements Action
{
    public function __construct(
        private readonly RecordAdminAuditAction $recordAudit,
    ) {}

    /**
     * @param  UserUnblockingData  $dto
     */
    public function handle(Data $dto): User
    {
        return DB::transaction(function () use ($dto): User {
            $user = User::query()->lockForUpdate()->findOrFail($dto->userId);

            /** @var CarbonImmutable|null $previousBlockedAt */
            $previousBlockedAt = $user->blocked_at;

            if ($previousBlockedAt === null) {
                throw new UserNotBlockedException($user->id);
            }

            $previousReason = $user->block_reason;

            $user->forceFill([
                'blocked_at' => null,
                'block_reason' => null,
            ])->save();

            $this->recordAudit->handle(new AdminAuditEntryData(
                actor: $dto->actor,
                action: AdminAuditAction::UserUnblocked,
                subjectType: AdminAuditSubject::User,
                subjectId: $user->id,
                metadata: [
                    'subject_label' => $user->email,
                    'previous_blocked_at' => $previousBlockedAt->toIso8601String(),
                    'previous_reason' => $previousReason,
                ],
            ));

            return $user;
        });
    }
}
