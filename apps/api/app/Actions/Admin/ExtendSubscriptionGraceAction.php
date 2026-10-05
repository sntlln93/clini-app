<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Admin\AdminAuditEntryData;
use App\Data\Admin\GraceExtensionData;
use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Enums\SubscriptionGraceReason;
use App\Enums\SubscriptionStatus;
use App\Exceptions\Subscriptions\GraceExtensionNotAllowedException;
use App\Exceptions\Subscriptions\GraceExtensionNotLaterException;
use App\Models\Organization;
use App\Models\Subscription;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Manual grace-period extension by an operator, only from `grace` or
 * `expired`. The result is always `grace` until the chosen end:
 *
 * - from `grace`, the new end must be strictly later and `grace_reason` is
 *   kept as-is;
 * - from `expired`, `grace_reason` becomes `payment_failed` — an expired
 *   row is already liftable only by an approved charge, exactly the
 *   semantics of a failed-payment grace in the webhook handling.
 *
 * `subscriptions:expire-grace` keeps working unchanged afterwards. The row
 * is locked so a concurrent webhook can't interleave.
 *
 * @implements Action<GraceExtensionData>
 */
class ExtendSubscriptionGraceAction implements Action
{
    public function __construct(
        private readonly RecordAdminAuditAction $recordAudit,
    ) {}

    /**
     * @param  GraceExtensionData  $dto
     */
    public function handle(Data $dto): Subscription
    {
        return DB::transaction(function () use ($dto): Subscription {
            $subscription = Subscription::withoutGlobalScope('organization')
                ->ofLiveOrganization()
                ->lockForUpdate()
                ->findOrFail($dto->subscriptionId);

            /** @var SubscriptionStatus $previousStatus */
            $previousStatus = $subscription->status;
            /** @var CarbonImmutable|null $previousEndsAt */
            $previousEndsAt = $subscription->grace_ends_at;
            /** @var SubscriptionGraceReason|null $previousReason */
            $previousReason = $subscription->grace_reason;

            if ($previousStatus !== SubscriptionStatus::Grace && $previousStatus !== SubscriptionStatus::Expired) {
                throw new GraceExtensionNotAllowedException($subscription->id, $previousStatus);
            }

            $graceEndsAt = $dto->graceEndsAt->utc();

            if ($previousStatus === SubscriptionStatus::Grace
                && $previousEndsAt !== null
                && $graceEndsAt->lessThanOrEqualTo($previousEndsAt)
            ) {
                throw new GraceExtensionNotLaterException($subscription->id, $previousEndsAt, $graceEndsAt);
            }

            $graceReason = $previousStatus === SubscriptionStatus::Grace
                ? $previousReason
                : SubscriptionGraceReason::PaymentFailed;

            $subscription->forceFill([
                'status' => SubscriptionStatus::Grace,
                'grace_ends_at' => $graceEndsAt,
                'grace_reason' => $graceReason,
            ])->save();

            $organization = Organization::query()->findOrFail($subscription->organization_id);
            $subscription->setRelation('organization', $organization);

            $this->recordAudit->handle(new AdminAuditEntryData(
                actor: $dto->actor,
                action: AdminAuditAction::SubscriptionGraceExtended,
                subjectType: AdminAuditSubject::Subscription,
                subjectId: $subscription->id,
                metadata: [
                    'subject_label' => $organization->name,
                    'previous_status' => $previousStatus->value,
                    'previous_grace_ends_at' => $previousEndsAt?->toIso8601String(),
                    'previous_grace_reason' => $previousReason?->value,
                    'grace_ends_at' => $graceEndsAt->toIso8601String(),
                    'grace_reason' => $graceReason?->value,
                    'note' => $dto->note,
                ],
            ));

            return $subscription;
        });
    }
}
