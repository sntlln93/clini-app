<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Subscription;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

/**
 * Organization detail: list fields plus members, the full subscription and
 * usage counts. Expects `memberships.user`, `subscription`,
 * `active_members_count` and the `usage_*` aggregates to be loaded — see
 * Organization::scopeWithAdminDetail().
 *
 * @mixin Organization
 */
class AdminOrganizationDetailResource extends AdminOrganizationResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $organization = $this->organization();

        /** @var Subscription|null $subscription */
        $subscription = $organization->subscription;

        $lastAppointment = $organization->getAttribute('usage_last_appointment_created_at');

        return array_merge($this->baseFields(), [
            'members' => $organization->memberships
                ->map(fn (Membership $membership): array => $this->member($membership))
                ->values()
                ->all(),
            'subscription' => $subscription === null
                ? null
                : (new AdminSubscriptionResource($subscription->setRelation('organization', $organization)))->toArray($request),
            'usage' => [
                'patients' => $this->countAttribute('usage_patients'),
                'professionals' => $this->countAttribute('usage_professionals'),
                'appointments_total' => $this->countAttribute('usage_appointments_total'),
                'appointments_last_30_days' => $this->countAttribute('usage_appointments_last_30_days'),
                'appointments_upcoming' => $this->countAttribute('usage_appointments_upcoming'),
                'last_appointment_created_at' => is_string($lastAppointment)
                    ? CarbonImmutable::parse($lastAppointment, 'UTC')->toIso8601String()
                    : null,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function member(Membership $membership): array
    {
        /** @var User $user */
        $user = $membership->user;

        /** @var array<int, MembershipRole> $roles */
        $roles = $membership->roles;

        /** @var MembershipStatus $status */
        $status = $membership->status;

        /** @var CarbonImmutable|null $blockedAt */
        $blockedAt = $user->blocked_at;

        return [
            'membership_id' => $membership->id,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'blocked_at' => $blockedAt?->toIso8601String(),
                'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            ],
            'roles' => array_map(fn (MembershipRole $role): string => $role->value, $roles),
            'status' => $status->value,
            'created_at' => $membership->created_at?->toIso8601String(),
        ];
    }
}
