<?php

declare(strict_types=1);

namespace App\Actions\Booking;

use App\Actions\Appointments\BookAppointmentAction;
use App\Actions\Patients\RegisterPatientAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Appointments\AppointmentBookingData;
use App\Data\Booking\OnlineBookingData;
use App\Data\Booking\SlotAvailabilityCheckData;
use App\Data\Patients\PatientRegistrationData;
use App\Enums\AppointmentOrigin;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\ProfessionalService;

/**
 * The public counterpart to BookAppointmentAction: identifies or creates
 * the patient by document, then delegates the actual write (advisory lock,
 * overlap check, row creation) to BookAppointmentAction — never duplicating
 * its transaction/locking. Only adds checks of its own: that the requested
 * membership actually belongs to the organization resolved from the public
 * slug (`Membership::query()->findOrFail`, respecting the `organization`
 * global scope — the same scoped form ListAvailableSlotsAction::handle
 * already uses — so a cross-org membership_id 404s here instead of reaching
 * BookAppointmentAction, which deliberately looks across organizations via
 * withoutGlobalScope('organization') for its own overlap check and would
 * never reject it), and, delegated to AssertSlotWithinPublishedScheduleAction,
 * that the requested start time falls within the professional's *published*
 * schedule — availabilities plus `extra` exceptions, minus `blocked`
 * exceptions, deliberately without excluding busy appointments.
 * BookAppointmentAction's own overlap check remains the single source of
 * SlotTakenException/appointments.slot_taken; this action never re-derives
 * or duplicates that check. Likewise, whether the service is active for the
 * professional is BookAppointmentAction's own call: when no active
 * ProfessionalService row exists, the pre-check simply skips the
 * published-schedule check (it has no duration to check against anyway)
 * instead of raising SlotNotAvailableException, so the 409 raised downstream
 * is ServiceNotActiveForProfessionalException, not a booking-specific one
 * that would mask it.
 *
 * @implements Action<OnlineBookingData>
 */
class BookOnlineAppointmentAction implements Action
{
    public function __construct(
        private readonly AssertSlotWithinPublishedScheduleAction $assertSlotWithinPublishedSchedule,
        private readonly RegisterPatientAction $registerPatient,
        private readonly BookAppointmentAction $bookAppointment,
    ) {}

    /**
     * @param  OnlineBookingData  $dto
     */
    public function handle(Data $dto): Appointment
    {
        // Respects the organization global scope, so a membership from
        // another organization 404s here — before a patient is registered
        // or BookAppointmentAction (which looks across organizations on
        // purpose) ever runs.
        Membership::query()->findOrFail($dto->membershipId);

        $this->assertSlotAvailable($dto);

        $patient = $this->registerPatient->handle(new PatientRegistrationData(
            organizationId: $dto->organizationId,
            createdBy: null,
            name: $dto->patientName,
            documentType: $dto->documentType,
            documentNumber: $dto->documentNumber,
            email: $dto->email,
            phone: $dto->phone,
            sex: null,
            birthDate: null,
            insuranceProviderId: null,
        ));

        return $this->bookAppointment->handle(new AppointmentBookingData(
            organizationId: $dto->organizationId,
            membershipId: $dto->membershipId,
            patientId: $patient->id,
            serviceId: $dto->serviceId,
            createdBy: null,
            startAt: $dto->startAt,
            origin: AppointmentOrigin::Online,
            reason: null,
            notes: null,
        ));
    }

    private function assertSlotAvailable(OnlineBookingData $dto): void
    {
        $professionalService = ProfessionalService::query()
            ->where('membership_id', $dto->membershipId)
            ->where('service_id', $dto->serviceId)
            ->where('active', true)
            ->first();

        if ($professionalService === null) {
            // Not this action's call: BookAppointmentAction re-checks the
            // same row and is the sole source of
            // ServiceNotActiveForProfessionalException/
            // appointments.service_not_active_for_professional.
            return;
        }

        $this->assertSlotWithinPublishedSchedule->handle(new SlotAvailabilityCheckData(
            organizationId: $dto->organizationId,
            membershipId: $dto->membershipId,
            startAt: $dto->startAt,
            durationMinutes: $professionalService->duration_minutes,
        ));
    }
}
