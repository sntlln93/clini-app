<?php

declare(strict_types=1);

namespace App\Actions\VitalSigns;

use App\Actions\ClinicalAccess\RecordClinicalAccessAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\VitalSigns\VitalSignAmendmentData;
use App\Enums\ClinicalAccessAction;
use App\Exceptions\VitalSigns\VitalSignAmendmentUnchangedException;
use App\Exceptions\VitalSigns\VitalSignAnnulledException;
use App\Models\VitalSign;
use App\Models\VitalSignVersion;
use Illuminate\Support\Facades\DB;

/**
 * Corrects a value loaded wrong in the same measurement (#361): the next version with every value, keeping every
 * previous one. `measured_at` stays, so it is the same point of the series, not a new one.
 *
 * @implements Action<VitalSignAmendmentData>
 */
class AmendVitalSignAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  VitalSignAmendmentData  $dto
     */
    public function handle(Data $dto): VitalSign
    {
        return DB::transaction(function () use ($dto): VitalSign {
            $vitalSign = VitalSign::query()->lockForUpdate()->findOrFail($dto->vitalSignId);

            if ($vitalSign->annulment()->exists()) {
                throw new VitalSignAnnulledException($vitalSign->id);
            }

            /** @var VitalSignVersion $current */
            $current = $vitalSign->versions()->reorder('version', 'desc')->firstOrFail();
            $values = $dto->values->toArray();

            // Loose on purpose: the decimal columns come back as floats of the same value.
            if ($current->only(array_keys($values)) == $values) {
                throw new VitalSignAmendmentUnchangedException($vitalSign->id, $current->version);
            }

            $vitalSign->versions()->create([
                'version' => $current->version + 1,
                'membership_id' => $dto->membershipId,
                'reason' => $dto->reason,
                ...$values,
            ]);

            $this->record->handle(new ClinicalAccessEntryData(
                organizationId: $vitalSign->organization_id,
                membershipId: $dto->membershipId,
                patientId: $vitalSign->patient_id,
                action: ClinicalAccessAction::VitalSignAmended,
                appointmentId: $vitalSign->appointment_id,
                vitalSignId: $vitalSign->id,
            ));

            return $vitalSign;
        });
    }
}
