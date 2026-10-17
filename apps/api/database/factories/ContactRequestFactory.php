<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ContactRequestStatus;
use App\Models\ContactRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Tests only.
 *
 * @extends Factory<ContactRequest>
 */
class ContactRequestFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => null,
            'organization_name' => null,
            'team_size' => null,
            'plan' => null,
            'message' => fake()->sentence(),
            'status' => ContactRequestStatus::New,
        ];
    }

    public function closed(): static
    {
        return $this->state(fn (): array => [
            'status' => ContactRequestStatus::Closed,
            'closed_at' => now(),
        ]);
    }
}
