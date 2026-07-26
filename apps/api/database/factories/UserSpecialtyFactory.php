<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Specialty;
use App\Models\User;
use App\Models\UserSpecialty;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserSpecialty>
 */
class UserSpecialtyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'specialty_id' => Specialty::factory(),
        ];
    }
}
