<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Admin\AdminAuditEntryData;
use App\Data\Admin\PlatformAdminLoginData;
use App\Enums\AdminAuditAction;
use App\Models\PlatformAdmin;
use Illuminate\Support\Facades\DB;

/**
 * Bookkeeping of a successful operator login (the session work stays in the
 * controller): stamps `last_login_at` and records `auth.login`.
 *
 * @implements Action<PlatformAdminLoginData>
 */
class RecordPlatformAdminLoginAction implements Action
{
    public function __construct(
        private readonly RecordAdminAuditAction $recordAudit,
    ) {}

    /**
     * @param  PlatformAdminLoginData  $dto
     */
    public function handle(Data $dto): PlatformAdmin
    {
        return DB::transaction(function () use ($dto): PlatformAdmin {
            $admin = PlatformAdmin::query()->findOrFail($dto->actor->platformAdminId);

            $admin->forceFill(['last_login_at' => now()])->save();

            $this->recordAudit->handle(new AdminAuditEntryData(
                actor: $dto->actor,
                action: AdminAuditAction::AuthLogin,
                subjectType: null,
                subjectId: null,
                metadata: [],
            ));

            return $admin;
        });
    }
}
