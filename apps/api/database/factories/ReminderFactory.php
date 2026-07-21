<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Models\Appointment;
use App\Models\Organization;
use App\Models\Reminder;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Reminder>
 */
class ReminderFactory extends Factory
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
            'appointment_id' => Appointment::factory(),
            'channel' => fake()->randomElement(ReminderChannel::cases()),
            'status' => ReminderStatus::Pending,
            'scheduled_at' => fake()->dateTimeBetween('now', '+1 month'),
            'sent_at' => null,
        ];
    }
}
