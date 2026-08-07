<?php

declare(strict_types=1);

namespace App\Actions\Memberships;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Memberships\MembershipSlugData;
use App\Enums\MembershipRole;
use App\Exceptions\Memberships\MembershipSlugInvalidFormatException;
use App\Exceptions\Memberships\MembershipSlugNotAllowedForRoleException;
use App\Exceptions\Memberships\MembershipSlugTakenException;
use App\Models\Membership;
use App\Models\Organization;
use Illuminate\Support\Facades\DB;

/**
 * Owns the membership public-slug rule: professional-only, format validated here (not in a FormRequest), uniqueness checked in-app rather than via a Postgres UNIQUE constraint (ADR 0004); a null/empty slug just clears it.
 *
 * @implements Action<MembershipSlugData>
 */
class SetMembershipSlugAction implements Action
{
    private const SLUG_PATTERN = '/^[a-z0-9]+(-[a-z0-9]+)*$/';

    private const MIN_LENGTH = 3;

    private const MAX_LENGTH = 50;

    /**
     * @param  MembershipSlugData  $dto
     */
    public function handle(Data $dto): Membership
    {
        return DB::transaction(function () use ($dto): Membership {
            $membership = Membership::withoutGlobalScope('organization')
                ->lockForUpdate()
                ->findOrFail($dto->membershipId);

            /** @var array<int, MembershipRole> $roles */
            $roles = $membership->roles;

            if (! in_array(MembershipRole::Professional, $roles, true)) {
                throw new MembershipSlugNotAllowedForRoleException($membership->id, $dto->slug);
            }

            $slug = $dto->slug !== null && $dto->slug !== '' ? $dto->slug : null;

            if ($slug === null) {
                $membership->update(['slug' => null]);

                return $membership;
            }

            if (! $this->hasValidFormat($slug)) {
                throw new MembershipSlugInvalidFormatException($membership->id, $slug);
            }

            // Serialises concurrent requests for this slug (ADR 0004); must run before isTaken(), whose unlocked lookups would otherwise race under READ COMMITTED.
            DB::statement('select pg_advisory_xact_lock(hashtext(?))', [$slug]);

            if ($this->isTaken($membership, $slug)) {
                throw new MembershipSlugTakenException($membership->id, $slug);
            }

            $membership->update(['slug' => $slug]);

            return $membership;
        });
    }

    private function hasValidFormat(string $slug): bool
    {
        $length = strlen($slug);

        return $length >= self::MIN_LENGTH
            && $length <= self::MAX_LENGTH
            && preg_match(self::SLUG_PATTERN, $slug) === 1;
    }

    private function isTaken(Membership $membership, string $slug): bool
    {
        $organizationSlugTaken = Organization::withTrashed()->where('slug', $slug)->exists();

        $membershipSlugTaken = Membership::withoutGlobalScope('organization')
            ->where('id', '!=', $membership->id)
            ->where('slug', $slug)
            ->exists();

        return $organizationSlugTaken || $membershipSlugTaken;
    }
}
