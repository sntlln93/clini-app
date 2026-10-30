<?php

declare(strict_types=1);

namespace App\Actions\VitalSigns;

use App\Actions\ClinicalAccess\RecordClinicalAccessAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\VitalSigns\VitalSignAnnulmentData;
use App\Enums\ClinicalAccessAction;
use App\Exceptions\VitalSigns\VitalSignAnnulledException;
use App\Models\VitalSign;
use Illuminate\Support\Facades\DB;

/**
 * Takes a measurement recorded by mistake out of the series (#361): it stays in the history with every version,
 * marked as annulled, as a note does (ADR 0019).
 *
 * @implements Action<VitalSignAnnulmentData>
 */
class AnnulVitalSignAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  VitalSignAnnulmentData  $dto
     */
    public function handle(Data $dto): VitalSign
    {
        return DB::transaction(function () use ($dto): VitalSign {
            $vitalSign = VitalSign::query()->lockForUpdate()->findOrFail($dto->vitalSignId);

            if ($vitalSign->annulment()->exists()) {
                throw new VitalSignAnnulledException($vitalSign->id);
            }

            $vitalSign->annulment()->create([
                'membership_id' => $dto->membershipId,
                'reason' => $dto->reason,
            ]);

            $this->record->handle(new ClinicalAccessEntryData(
                organizationId: $vitalSign->organization_id,
                membershipId: $dto->membershipId,
                patientId: $vitalSign->patient_id,
                action: ClinicalAccessAction::VitalSignAnnulled,
                appointmentId: $vitalSign->appointment_id,
                vitalSignId: $vitalSign->id,
            ));

            return $vitalSign;
        });
    }
}
