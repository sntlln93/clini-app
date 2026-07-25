<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Auth\OrganizationOwnerRegistrationData;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @implements Action<OrganizationOwnerRegistrationData>
 */
class RegisterOrganizationOwnerAction implements Action
{
    /**
     * @param  OrganizationOwnerRegistrationData  $dto
     */
    public function handle(Data $dto): User
    {
        return DB::transaction(function () use ($dto): User {
            $user = User::create([
                'name' => $dto->name,
                'email' => $dto->email,
                'password' => Hash::make($dto->password),
            ]);

            $organization = Organization::create([
                'name' => $dto->organizationName,
                'slug' => $this->uniqueSlug($dto->organizationName),
                'timezone' => $dto->timezone,
            ]);

            Membership::create([
                'organization_id' => $organization->id,
                'user_id' => $user->id,
                'roles' => [MembershipRole::Owner],
                'status' => MembershipStatus::Active,
            ]);

            return $user;
        });
    }

    private function uniqueSlug(string $organizationName): string
    {
        $base = Str::slug($organizationName);
        $slug = $base;
        $suffix = 2;

        while (Organization::withTrashed()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
