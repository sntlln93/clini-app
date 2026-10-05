<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Admin\AdminAuditEntryData;
use App\Data\Admin\OrganizationSuspensionData;
use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Exceptions\Organizations\OrganizationAlreadySuspendedException;
use App\Models\Organization;
use Illuminate\Support\Facades\DB;

/**
 * Suspends an organization: its members are rejected on every org-scoped
 * panel route and its public booking is disabled (enforced by the
 * organization-resolving middleware, not here).
 *
 * @implements Action<OrganizationSuspensionData>
 */
class SuspendOrganizationAction implements Action
{
    public function __construct(
        private readonly RecordAdminAuditAction $recordAudit,
    ) {}

    /**
     * @param  OrganizationSuspensionData  $dto
     */
    public function handle(Data $dto): Organization
    {
        return DB::transaction(function () use ($dto): Organization {
            $organization = Organization::query()->lockForUpdate()->findOrFail($dto->organizationId);

            if ($organization->suspended_at !== null) {
                throw new OrganizationAlreadySuspendedException($organization->id);
            }

            $organization->forceFill([
                'suspended_at' => now(),
                'suspension_reason' => $dto->reason,
            ])->save();

            $this->recordAudit->handle(new AdminAuditEntryData(
                actor: $dto->actor,
                action: AdminAuditAction::OrganizationSuspended,
                subjectType: AdminAuditSubject::Organization,
                subjectId: $organization->id,
                metadata: [
                    'subject_label' => $organization->name,
                    'reason' => $dto->reason,
                ],
            ));

            return $organization;
        });
    }
}
