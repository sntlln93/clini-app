<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Admin\AdminAuditEntryData;
use App\Data\Admin\OrganizationReactivationData;
use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Exceptions\Organizations\OrganizationNotSuspendedException;
use App\Models\Organization;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Lifts a suspension, keeping the previous suspension in the audit row.
 *
 * @implements Action<OrganizationReactivationData>
 */
class ReactivateOrganizationAction implements Action
{
    public function __construct(
        private readonly RecordAdminAuditAction $recordAudit,
    ) {}

    /**
     * @param  OrganizationReactivationData  $dto
     */
    public function handle(Data $dto): Organization
    {
        return DB::transaction(function () use ($dto): Organization {
            $organization = Organization::query()->lockForUpdate()->findOrFail($dto->organizationId);

            /** @var CarbonImmutable|null $previousSuspendedAt */
            $previousSuspendedAt = $organization->suspended_at;

            if ($previousSuspendedAt === null) {
                throw new OrganizationNotSuspendedException($organization->id);
            }

            $previousReason = $organization->suspension_reason;

            $organization->forceFill([
                'suspended_at' => null,
                'suspension_reason' => null,
            ])->save();

            $this->recordAudit->handle(new AdminAuditEntryData(
                actor: $dto->actor,
                action: AdminAuditAction::OrganizationReactivated,
                subjectType: AdminAuditSubject::Organization,
                subjectId: $organization->id,
                metadata: [
                    'subject_label' => $organization->name,
                    'previous_suspended_at' => $previousSuspendedAt->toIso8601String(),
                    'previous_reason' => $previousReason,
                ],
            ));

            return $organization;
        });
    }
}
