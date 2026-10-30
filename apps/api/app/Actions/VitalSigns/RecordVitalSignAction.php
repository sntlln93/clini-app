<?php

declare(strict_types=1);

namespace App\Actions\VitalSigns;

use App\Actions\ClinicalAccess\RecordClinicalAccessAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\VitalSigns\VitalSignDraftData;
use App\Enums\ClinicalAccessAction;
use App\Models\VitalSign;
use Illuminate\Support\Facades\DB;

/**
 * A new point in the patient's series: the values are the measurement's version 1 (ADR 0019), and the access log
 * records who took it (#325).
 *
 * @implements Action<VitalSignDraftData>
 */
class RecordVitalSignAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  VitalSignDraftData  $dto
     */
    public function handle(Data $dto): VitalSign
    {
        return DB::transaction(function () use ($dto): VitalSign {
            $vitalSign = VitalSign::create([
                'organization_id' => $dto->organizationId,
                'appointment_id' => $dto->appointmentId,
                'patient_id' => $dto->patientId,
                'membership_id' => $dto->membershipId,
                'measured_at' => now(),
            ]);

            $vitalSign->versions()->create([
                'version' => 1,
                'membership_id' => $dto->membershipId,
                ...$dto->values->toArray(),
            ]);

            $this->record->handle(new ClinicalAccessEntryData(
                organizationId: $vitalSign->organization_id,
                membershipId: $dto->membershipId,
                patientId: $vitalSign->patient_id,
                action: ClinicalAccessAction::VitalSignRecorded,
                appointmentId: $vitalSign->appointment_id,
                vitalSignId: $vitalSign->id,
            ));

            return $vitalSign;
        });
    }
}
