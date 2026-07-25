<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Membership>
 */
class MembershipFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'user_id' => User::factory(),
            'roles' => [MembershipRole::Owner],
            'extra_permissions' => [],
            'status' => MembershipStatus::Active,
        ];
    }

    /**
     * @return $this
     */
    public function owner(): static
    {
        return $this->withRoles(MembershipRole::Owner);
    }

    /**
     * @return $this
     */
    public function admin(): static
    {
        return $this->withRoles(MembershipRole::Admin);
    }

    /**
     * @return $this
     */
    public function staff(): static
    {
        return $this->withRoles(MembershipRole::Staff);
    }

    /**
     * @return $this
     */
    public function professional(): static
    {
        return $this->withRoles(MembershipRole::Professional);
    }

    /**
     * @return $this
     */
    public function withRoles(MembershipRole ...$roles): static
    {
        return $this->state(fn (array $attributes): array => [
            'roles' => $roles,
        ]);
    }
}
