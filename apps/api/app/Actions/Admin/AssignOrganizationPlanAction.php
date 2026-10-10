<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Admin\AdminAuditEntryData;
use App\Data\Admin\OrganizationPlanAssignmentData;
use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Enums\Plan;
use App\Enums\SubscriptionStatus;
use App\Exceptions\Plans\PlanAssignmentUnchangedException;
use App\Exceptions\Plans\PlanSubscriptionLiveException;
use App\Models\Organization;
use App\Models\Subscription;
use Illuminate\Support\Facades\DB;

/**
 * Assigns Center (billed outside the platform) or returns the organization
 * to self-service (#237). Center is refused while the Mercado Pago
 * subscription can still charge, so nobody is billed twice. Locks the
 * organization row, then its subscription, like checkout.
 *
 * @implements Action<OrganizationPlanAssignmentData>
 */
class AssignOrganizationPlanAction implements Action
{
    private const CHARGING = [SubscriptionStatus::Active, SubscriptionStatus::Grace, SubscriptionStatus::Expired];

    public function __construct(
        private readonly RecordAdminAuditAction $recordAudit,
    ) {}

    /**
     * @param  OrganizationPlanAssignmentData  $dto
     */
    public function handle(Data $dto): Organization
    {
        return DB::transaction(function () use ($dto): Organization {
            $organization = Organization::query()->lockForUpdate()->findOrFail($dto->organizationId);

            /** @var Plan|null $previous */
            $previous = $organization->assigned_plan;

            if ($previous === $dto->assignedPlan) {
                throw new PlanAssignmentUnchangedException($organization->id, $previous);
            }

            $subscription = Subscription::withoutGlobalScope('organization')
                ->where('organization_id', $organization->id)
                ->lockForUpdate()
                ->first();

            /** @var SubscriptionStatus|null $status */
            $status = $subscription?->status;

            if ($dto->assignedPlan !== null && $status !== null && in_array($status, self::CHARGING, true)) {
                throw new PlanSubscriptionLiveException($organization->id, $status);
            }

            $organization->forceFill(['assigned_plan' => $dto->assignedPlan])->save();

            $this->recordAudit->handle(new AdminAuditEntryData(
                actor: $dto->actor,
                action: AdminAuditAction::OrganizationPlanAssigned,
                subjectType: AdminAuditSubject::Organization,
                subjectId: $organization->id,
                metadata: [
                    'subject_label' => $organization->name,
                    'previous_assigned_plan' => $previous?->value,
                    'assigned_plan' => $dto->assignedPlan?->value,
                    'reason' => $dto->reason,
                ],
            ));

            return $organization;
        });
    }
}
