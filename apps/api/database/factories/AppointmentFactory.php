<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AppointmentOrigin;
use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Appointment>
 */
class AppointmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startAt = fake()->dateTimeBetween('now', '+1 month');

        return [
            'organization_id' => Organization::factory(),
            'membership_id' => fn (array $attributes) => Membership::factory()->state([
                'organization_id' => $attributes['organization_id'],
            ]),
            'patient_id' => Patient::factory(),
            'service_id' => fn (array $attributes) => Service::factory()->state([
                'organization_id' => $attributes['organization_id'],
            ]),
            'created_by' => null,
            'origin' => AppointmentOrigin::Manual,
            'status' => AppointmentStatus::Scheduled,
            'start_at' => $startAt,
            'end_at' => (clone $startAt)->modify('+30 minutes'),
            'reason' => fake()->sentence(),
            'confirmed_at' => null,
            'arrived_at' => null,
            'completed_at' => null,
            'cancelled_at' => null,
            'cancelled_by' => null,
            'cancellation_reason' => null,
            'rescheduled_from_id' => null,
            'notes' => null,
        ];
    }
}
