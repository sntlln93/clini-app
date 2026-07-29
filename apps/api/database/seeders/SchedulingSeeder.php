<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AppointmentOrigin;
use App\Enums\AppointmentStatus;
use App\Enums\AvailabilityExceptionType;
use App\Enums\MembershipRole;
use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Models\Appointment;
use App\Models\Availability;
use App\Models\AvailabilityException;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Reminder;
use App\Models\Service;
use Illuminate\Database\Seeder;

/**
 * Availability, exceptions, appointments and reminders for a fixture
 * organization, with every date relative to now() rather than a literal
 * calendar date.
 *
 * None of these tables has a natural key, so this seeder is idempotent by
 * deleting the organization's own rows first, in FK-safe order (reminders
 * -> appointments -> availability_exceptions -> availabilities), and
 * re-inserting — always scoped to $organization->id, never a global
 * truncate or an unfiltered delete. Appointment is soft-deletable, so its
 * cleanup uses forceDelete(): a plain delete() would only set deleted_at,
 * which keeps row counts stable under the default (non-trashed) scope but
 * accumulates dead rows on every re-seed instead of actually clearing them.
 */
class SchedulingSeeder extends Seeder
{
    public function run(Organization $organization): void
    {
        $this->clearFixtureRows($organization);

        $professionalMemberships = Membership::where('organization_id', $organization->id)
            ->orderBy('id')
            ->get()
            ->filter(fn (Membership $membership): bool => in_array(MembershipRole::Professional, $membership->roles, true))
            ->values();

        $membership = $professionalMemberships->first();

        if ($membership === null) {
            return;
        }

        $this->seedAvailability($organization, $membership);
        $this->seedAvailabilityExceptions($organization, $membership);
        $this->seedAppointmentsAndReminders($organization, $membership);
    }

    private function clearFixtureRows(Organization $organization): void
    {
        Reminder::where('organization_id', $organization->id)->delete();
        Appointment::where('organization_id', $organization->id)->forceDelete();
        AvailabilityException::where('organization_id', $organization->id)->delete();
        Availability::where('organization_id', $organization->id)->delete();
    }

    private function seedAvailability(Organization $organization, Membership $membership): void
    {
        foreach ([1, 2, 3, 4, 5] as $dayOfWeek) {
            Availability::create([
                'organization_id' => $organization->id,
                'membership_id' => $membership->id,
                'day_of_week' => $dayOfWeek,
                'start_time' => '09:00:00',
                'end_time' => '17:00:00',
            ]);
        }
    }

    private function seedAvailabilityExceptions(Organization $organization, Membership $membership): void
    {
        AvailabilityException::create([
            'organization_id' => $organization->id,
            'membership_id' => $membership->id,
            'type' => AvailabilityExceptionType::Blocked,
            'start_at' => now()->addDays(3)->setTime(9, 0),
            'end_at' => now()->addDays(3)->setTime(13, 0),
            'reason' => 'Congreso profesional',
        ]);

        AvailabilityException::create([
            'organization_id' => $organization->id,
            'membership_id' => $membership->id,
            'type' => AvailabilityExceptionType::Extra,
            'start_at' => now()->addDays(5)->setTime(18, 0),
            'end_at' => now()->addDays(5)->setTime(20, 0),
            'reason' => 'Turno extra sábado',
        ]);
    }

    private function seedAppointmentsAndReminders(Organization $organization, Membership $membership): void
    {
        /** @var Patient|null $patient */
        $patient = $organization->patients()->orderBy('patients.id')->first();
        $service = Service::orderBy('id')->first();

        if ($patient === null || $service === null) {
            return;
        }

        $appointments = $this->seedAppointments($organization, $membership, $patient, $service);
        $this->seedReminders($organization, $appointments);
    }

    /**
     * @return array<string, Appointment>
     */
    private function seedAppointments(Organization $organization, Membership $membership, Patient $patient, Service $service): array
    {
        $base = [
            'organization_id' => $organization->id,
            'membership_id' => $membership->id,
            'patient_id' => $patient->id,
            'service_id' => $service->id,
        ];

        $scheduled = Appointment::create($base + [
            'origin' => AppointmentOrigin::Online,
            'status' => AppointmentStatus::Scheduled,
            'start_at' => now()->addDays(2)->setTime(10, 0),
            'end_at' => now()->addDays(2)->setTime(10, 30),
            'reason' => 'Consulta de control',
        ]);

        $confirmed = Appointment::create($base + [
            'origin' => AppointmentOrigin::Manual,
            'status' => AppointmentStatus::Confirmed,
            'start_at' => now()->addDay()->setTime(11, 0),
            'end_at' => now()->addDay()->setTime(11, 30),
            'reason' => 'Consulta',
            'confirmed_at' => now(),
        ]);

        Appointment::create($base + [
            'origin' => AppointmentOrigin::Manual,
            'status' => AppointmentStatus::Arrived,
            'start_at' => now()->startOfDay()->addHours(10),
            'end_at' => now()->startOfDay()->addHours(10)->addMinutes(30),
            'reason' => 'Consulta de hoy',
            'arrived_at' => now(),
        ]);

        $completed = Appointment::create($base + [
            'origin' => AppointmentOrigin::Manual,
            'status' => AppointmentStatus::Completed,
            'start_at' => now()->subDays(3)->setTime(9, 0),
            'end_at' => now()->subDays(3)->setTime(9, 30),
            'reason' => 'Consulta completada',
            'confirmed_at' => now()->subDays(3)->subHour(),
            'arrived_at' => now()->subDays(3)->setTime(9, 0),
            'completed_at' => now()->subDays(3)->setTime(9, 30),
        ]);

        Appointment::create($base + [
            'origin' => AppointmentOrigin::Manual,
            'status' => AppointmentStatus::NoShow,
            'start_at' => now()->subDays(2)->setTime(15, 0),
            'end_at' => now()->subDays(2)->setTime(15, 30),
            'reason' => 'Paciente no se presentó',
        ]);

        Appointment::create($base + [
            'origin' => AppointmentOrigin::Manual,
            'status' => AppointmentStatus::Cancelled,
            'start_at' => now()->subDay()->setTime(16, 0),
            'end_at' => now()->subDay()->setTime(16, 30),
            'reason' => 'Consulta cancelada',
            'cancelled_at' => now()->subDay(),
            'cancellation_reason' => 'El paciente canceló por otro compromiso',
        ]);

        $original = Appointment::create($base + [
            'origin' => AppointmentOrigin::Online,
            'status' => AppointmentStatus::Rescheduled,
            'start_at' => now()->addDays(3)->setTime(9, 0),
            'end_at' => now()->addDays(3)->setTime(9, 30),
            'reason' => 'Consulta original (reprogramada)',
        ]);

        Appointment::create($base + [
            'origin' => AppointmentOrigin::Online,
            'status' => AppointmentStatus::Scheduled,
            'start_at' => now()->addDays(4)->setTime(9, 0),
            'end_at' => now()->addDays(4)->setTime(9, 30),
            'reason' => 'Consulta reprogramada',
            'rescheduled_from_id' => $original->id,
        ]);

        return ['scheduled' => $scheduled, 'confirmed' => $confirmed, 'completed' => $completed];
    }

    /**
     * @param  array<string, Appointment>  $appointments
     */
    private function seedReminders(Organization $organization, array $appointments): void
    {
        Reminder::create([
            'organization_id' => $organization->id,
            'appointment_id' => $appointments['scheduled']->id,
            'channel' => ReminderChannel::Email,
            'status' => ReminderStatus::Pending,
            'scheduled_at' => $appointments['scheduled']->start_at->copy()->subHours(24),
        ]);

        Reminder::create([
            'organization_id' => $organization->id,
            'appointment_id' => $appointments['confirmed']->id,
            'channel' => ReminderChannel::Sms,
            'status' => ReminderStatus::Sent,
            'scheduled_at' => $appointments['confirmed']->start_at->copy()->subHours(24),
            'sent_at' => now()->subHours(2),
        ]);

        Reminder::create([
            'organization_id' => $organization->id,
            'appointment_id' => $appointments['completed']->id,
            'channel' => ReminderChannel::Whatsapp,
            'status' => ReminderStatus::Failed,
            'scheduled_at' => $appointments['completed']->start_at->copy()->subHours(24),
        ]);
    }
}
