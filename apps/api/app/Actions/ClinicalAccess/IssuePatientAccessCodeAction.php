<?php

declare(strict_types=1);

namespace App\Actions\ClinicalAccess;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\AccessCodeIssuanceData;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Enums\ClinicalAccessAction;
use App\Models\Appointment;
use App\Models\PatientAccessCode;
use App\Support\ClinicalAccess;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Issues the appointment's access code, or returns the one it already has (#364, ADR 0029): one per appointment, for
 * its professional, valid until the appointment's window ends. The appointment's row is locked so two issuances at
 * once can't both create one. The trail records it on the professional the code is for.
 *
 * @implements Action<AccessCodeIssuanceData>
 */
class IssuePatientAccessCodeAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  AccessCodeIssuanceData  $dto
     */
    public function handle(Data $dto): PatientAccessCode
    {
        return DB::transaction(function () use ($dto): PatientAccessCode {
            $appointment = Appointment::query()
                ->withoutGlobalScope('organization')
                ->lockForUpdate()
                ->findOrFail($dto->appointmentId);

            $existing = PatientAccessCode::query()
                ->withoutGlobalScope('organization')
                ->where('appointment_id', $appointment->id)
                ->first();

            if ($existing !== null) {
                return $existing;
            }

            /** @var Carbon $startAt */
            $startAt = $appointment->start_at;
            $code = '';

            for ($i = 0; $i < PatientAccessCode::LENGTH; $i++) {
                $code .= PatientAccessCode::ALPHABET[random_int(0, strlen(PatientAccessCode::ALPHABET) - 1)];
            }

            $accessCode = PatientAccessCode::query()->create([
                'organization_id' => $appointment->organization_id,
                'appointment_id' => $appointment->id,
                'patient_id' => $appointment->patient_id,
                'membership_id' => $appointment->membership_id,
                'code' => $code,
                'expires_at' => $startAt->clone()->addDays(ClinicalAccess::WINDOW_DAYS)->utc(),
            ]);

            $this->record->handle(new ClinicalAccessEntryData(
                organizationId: $appointment->organization_id,
                membershipId: $appointment->membership_id,
                patientId: $appointment->patient_id,
                action: ClinicalAccessAction::AccessCodeIssued,
                appointmentId: $appointment->id,
            ));

            return $accessCode;
        });
    }
}
