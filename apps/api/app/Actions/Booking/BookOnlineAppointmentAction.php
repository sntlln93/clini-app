<?php

declare(strict_types=1);

namespace App\Actions\Booking;

use App\Actions\Appointments\BookAppointmentAction;
use App\Actions\Patients\RegisterPatientAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Appointments\AppointmentBookingData;
use App\Data\Booking\OnlineBookingData;
use App\Data\Booking\SlotSearchData;
use App\Data\Patients\PatientRegistrationData;
use App\Enums\AppointmentOrigin;
use App\Exceptions\Booking\SlotNotAvailableException;
use App\Models\Appointment;
use App\Models\ProfessionalService;

/**
 * The public counterpart to BookAppointmentAction: identifies or creates
 * the patient by document, then delegates the actual write (advisory lock,
 * overlap check, row creation) to BookAppointmentAction — never duplicating
 * its transaction/locking. Only adds one check of its own: the requested
 * start time must fall within the professional's *published* schedule
 * (ListAvailableSlotsAction::isWithinPublishedSchedule) — availabilities
 * plus `extra` exceptions, minus `blocked` exceptions, deliberately without
 * excluding busy appointments. BookAppointmentAction's own overlap check
 * remains the single source of SlotTakenException/appointments.slot_taken;
 * this action never re-derives or duplicates that check.
 *
 * @implements Action<OnlineBookingData>
 */
class BookOnlineAppointmentAction implements Action
{
    public function __construct(
        private readonly ListAvailableSlotsAction $listAvailableSlots,
        private readonly RegisterPatientAction $registerPatient,
        private readonly BookAppointmentAction $bookAppointment,
    ) {}

    /**
     * @param  OnlineBookingData  $dto
     */
    public function handle(Data $dto): Appointment
    {
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
            throw new SlotNotAvailableException($dto->membershipId, $dto->startAt);
        }

        $withinPublishedSchedule = $this->listAvailableSlots->isWithinPublishedSchedule(
            new SlotSearchData(
                organizationId: $dto->organizationId,
                membershipId: $dto->membershipId,
                serviceId: $dto->serviceId,
                from: $dto->startAt,
                to: $dto->startAt,
            ),
            $dto->startAt,
            $professionalService->duration_minutes,
        );

        if (! $withinPublishedSchedule) {
            throw new SlotNotAvailableException($dto->membershipId, $dto->startAt);
        }
    }
}
