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
 * The scoped Membership::query()->findOrFail 404s a cross-org membership_id
 * here, since BookAppointmentAction deliberately looks across organizations
 * (withoutGlobalScope('organization')) and would never reject it.
 * BookAppointmentAction stays the sole source of the overlap check /
 * SlotTakenException. When no active ProfessionalService exists, the
 * pre-check returns rather than raising, so the downstream 409 is
 * ServiceNotActiveForProfessionalException, not masked by one of this
 * action's own.
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
