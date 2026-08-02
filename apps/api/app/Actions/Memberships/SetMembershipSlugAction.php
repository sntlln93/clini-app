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
 * Owns the whole public-slug rule for a membership: only a `professional`
 * membership may have one, the format is validated here (never by a
 * FormRequest regex, per the issue's decision), and uniqueness is checked
 * across the flat namespace shared with organizations.slug and every other
 * membership's slug — never with a Postgres UNIQUE constraint (ADR 0004).
 * A null/empty slug clears the link and skips the format/uniqueness checks.
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

            // Serialises concurrent requests for the same slug (ADR 0004):
            // released automatically at transaction end, never unlocked
            // manually. Must run before isTaken(), whose lookups are
            // otherwise unlocked and would race under READ COMMITTED.
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
