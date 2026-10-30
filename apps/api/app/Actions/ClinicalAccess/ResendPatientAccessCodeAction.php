<?php

declare(strict_types=1);

namespace App\Actions\ClinicalAccess;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\AccessCodeDeliveryData;
use App\Data\ClinicalAccess\AccessCodeIssuanceData;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Enums\ClinicalAccessAction;
use App\Exceptions\ClinicalAccess\AccessCodeContactUnavailableException;
use App\Exceptions\ClinicalAccess\AccessCodeUnavailableException;
use App\Jobs\ClinicalAccess\SendPatientAccessCodeJob;
use App\Models\Appointment;
use App\Models\PatientAccessCode;
use App\Models\PatientContact;
use App\Support\ClinicalAccess;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Resends an appointment's access code to one of the patient's addresses, when the patient asks the practice for it
 * (#364, ADR 0029). Whoever sends it never sees it. It issues the code if the appointment has none yet (history written
 * after the booking), and only while the appointment still brings a consultation and its window is open.
 *
 * @implements Action<AccessCodeDeliveryData>
 */
class ResendPatientAccessCodeAction implements Action
{
    public function __construct(
        private readonly IssuePatientAccessCodeAction $issue,
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  AccessCodeDeliveryData  $dto
     */
    public function handle(Data $dto): PatientAccessCode
    {
        return DB::transaction(function () use ($dto): PatientAccessCode {
            $appointment = Appointment::query()
                ->withoutGlobalScope('organization')
                ->where('organization_id', $dto->organizationId)
                ->findOrFail($dto->appointmentId);

            /** @var Carbon $startAt */
            $startAt = $appointment->start_at;

            if (in_array($appointment->status, ClinicalAccess::CLOSED_STATUSES, true)
                || $startAt->clone()->addDays(ClinicalAccess::WINDOW_DAYS)->isPast()) {
                throw new AccessCodeUnavailableException($appointment->id);
            }

            $contact = PatientContact::query()
                ->where('patient_id', $appointment->patient_id)
                ->forReminders()
                ->find($dto->contactId);

            if ($contact === null) {
                throw new AccessCodeContactUnavailableException($dto->contactId);
            }

            $accessCode = $this->issue->handle(new AccessCodeIssuanceData($appointment->id));

            $this->record->handle(new ClinicalAccessEntryData(
                organizationId: $dto->organizationId,
                membershipId: $dto->membershipId,
                patientId: $appointment->patient_id,
                action: ClinicalAccessAction::AccessCodeResent,
                appointmentId: $appointment->id,
            ));

            SendPatientAccessCodeJob::dispatch($accessCode, $contact->id)->afterCommit();

            return $accessCode;
        });
    }
}
