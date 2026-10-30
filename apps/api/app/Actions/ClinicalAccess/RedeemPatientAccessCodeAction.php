<?php

declare(strict_types=1);

namespace App\Actions\ClinicalAccess;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\AccessCodeRedemptionData;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Enums\ClinicalAccessAction;
use App\Exceptions\ClinicalAccess\AccessCodeInvalidException;
use App\Models\PatientAccessCode;
use Illuminate\Support\Facades\DB;

/**
 * Redeems a code the patient shared (#364, ADR 0029). Only a code issued for one of the professional's own appointments
 * with the patient, not redeemed yet and still within its window, matches; the redeemed row is the access, so it ends
 * with the appointment's window. The candidates are locked so the same code can't be redeemed twice at once.
 *
 * @implements Action<AccessCodeRedemptionData>
 */
class RedeemPatientAccessCodeAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  AccessCodeRedemptionData  $dto
     */
    public function handle(Data $dto): PatientAccessCode
    {
        return DB::transaction(function () use ($dto): PatientAccessCode {
            $typed = PatientAccessCode::normalize($dto->code);

            $match = PatientAccessCode::query()
                ->withoutGlobalScope('organization')
                ->where('organization_id', $dto->organizationId)
                ->where('patient_id', $dto->patientId)
                ->where('membership_id', $dto->membershipId)
                ->whereNull('redeemed_at')
                ->valid()
                ->lockForUpdate()
                ->get()
                ->first(fn (PatientAccessCode $candidate): bool => hash_equals((string) $candidate->code, $typed));

            if ($match === null) {
                throw new AccessCodeInvalidException($dto->patientId);
            }

            $match->update(['redeemed_at' => now()]);

            $this->record->handle(new ClinicalAccessEntryData(
                organizationId: $dto->organizationId,
                membershipId: $dto->membershipId,
                patientId: $dto->patientId,
                action: ClinicalAccessAction::AccessCodeRedeemed,
                appointmentId: $match->appointment_id,
            ));

            return $match;
        });
    }
}
