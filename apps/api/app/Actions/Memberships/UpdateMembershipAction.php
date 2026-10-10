<?php

declare(strict_types=1);

namespace App\Actions\Memberships;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Memberships\MembershipUpdateData;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Exceptions\Memberships\LastActiveAdminException;
use App\Jobs\Subscriptions\SyncSubscriptionAmountJob;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\OrganizationPlan;
use Illuminate\Support\Facades\DB;

/**
 * The CU-04/CU-05 "keep at least one active owner/admin" invariant is checked and written inside a single row-locked transaction so two concurrent updates can't both pass and leave none.
 *
 * Only the roles a membership gains as active go through the plan's member rules (#237), under the organization's row lock, so a downgraded organization can still demote or deactivate.
 *
 * @implements Action<MembershipUpdateData>
 */
class UpdateMembershipAction implements Action
{
    public function __construct(
        private readonly OrganizationPlan $plans,
    ) {}

    /**
     * @param  MembershipUpdateData  $dto
     */
    public function handle(Data $dto): Membership
    {
        return DB::transaction(function () use ($dto): Membership {
            $membership = Membership::lockForUpdate()->findOrFail($dto->membershipId);

            $newRolesKeepOwnerOrAdmin = collect($dto->roles)->contains(
                fn (MembershipRole $role): bool => in_array($role, [MembershipRole::Owner, MembershipRole::Admin], true)
            );

            $organizationKeepsOwnerOrAdmin = $dto->status === MembershipStatus::Active && $newRolesKeepOwnerOrAdmin;

            if (! $organizationKeepsOwnerOrAdmin && ! $this->anotherActiveOwnerOrAdminExists($membership)) {
                throw new LastActiveAdminException($membership->id, $membership->organization_id);
            }

            /** @var array<int, MembershipRole> $previousRoles */
            $previousRoles = $membership->roles;
            $wasActive = $membership->status === MembershipStatus::Active;
            $gainedRoles = $this->gainedActiveRoles($wasActive ? $previousRoles : [], $dto);

            if ($gainedRoles !== []) {
                Organization::query()->whereKey($membership->organization_id)->lockForUpdate()->first(['id']);
                $this->plans->ensureAllowsMember($membership->organization_id, $gainedRoles);
            }

            $membership->update([
                'roles' => $dto->roles,
                'status' => $dto->status,
            ]);

            if (in_array(MembershipRole::Professional, [...$previousRoles, ...$dto->roles], true)) {
                SyncSubscriptionAmountJob::dispatch($membership->organization_id);
            }

            return $membership;
        });
    }

    /**
     * @param  array<int, MembershipRole>  $activeRoles
     * @return array<int, MembershipRole>
     */
    private function gainedActiveRoles(array $activeRoles, MembershipUpdateData $dto): array
    {
        if ($dto->status !== MembershipStatus::Active) {
            return [];
        }

        return array_values(array_filter(
            $dto->roles,
            fn (MembershipRole $role): bool => ! in_array($role, $activeRoles, true),
        ));
    }

    private function anotherActiveOwnerOrAdminExists(Membership $membership): bool
    {
        return Membership::query()
            ->where('id', '!=', $membership->id)
            ->where('status', MembershipStatus::Active)
            ->lockForUpdate()
            ->get()
            ->contains(function (Membership $other): bool {
                /** @var array<int, MembershipRole> $roles */
                $roles = $other->roles;

                return collect($roles)->contains(
                    fn (MembershipRole $role): bool => in_array($role, [MembershipRole::Owner, MembershipRole::Admin], true)
                );
            });
    }
}
