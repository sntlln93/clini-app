<?php

declare(strict_types=1);

namespace App\Actions;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RegisterOrganizationOwner
{
    public function execute(
        string $name,
        string $email,
        string $password,
        string $organizationName,
        string $timezone,
    ): User {
        return DB::transaction(function () use ($name, $email, $password, $organizationName, $timezone): User {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
            ]);

            $organization = Organization::create([
                'name' => $organizationName,
                'slug' => $this->uniqueSlug($organizationName),
                'timezone' => $timezone,
            ]);

            Membership::create([
                'organization_id' => $organization->id,
                'user_id' => $user->id,
                'role' => MembershipRole::Owner,
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
