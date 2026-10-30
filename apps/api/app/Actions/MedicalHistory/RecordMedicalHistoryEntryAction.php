<?php

declare(strict_types=1);

namespace App\Actions\MedicalHistory;

use App\Actions\ClinicalAccess\RecordClinicalAccessAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\MedicalHistory\MedicalHistoryEntryDraftData;
use App\Enums\ClinicalAccessAction;
use App\Models\MedicalHistoryEntry;
use Illuminate\Support\Facades\DB;

/**
 * The text is the entry's version 1 (ADR 0019), and the access log records who recorded it (#325).
 *
 * @implements Action<MedicalHistoryEntryDraftData>
 */
class RecordMedicalHistoryEntryAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  MedicalHistoryEntryDraftData  $dto
     */
    public function handle(Data $dto): MedicalHistoryEntry
    {
        return DB::transaction(function () use ($dto): MedicalHistoryEntry {
            $entry = MedicalHistoryEntry::create([
                'organization_id' => $dto->organizationId,
                'appointment_id' => $dto->appointmentId,
                'patient_id' => $dto->patientId,
                'membership_id' => $dto->membershipId,
                'category' => $dto->category,
            ]);

            $entry->versions()->create([
                'version' => 1,
                'membership_id' => $dto->membershipId,
                ...$dto->content->forCategory($dto->category)->toArray(),
            ]);

            $this->record->handle(new ClinicalAccessEntryData(
                organizationId: $entry->organization_id,
                membershipId: $dto->membershipId,
                patientId: $entry->patient_id,
                action: ClinicalAccessAction::MedicalHistoryRecorded,
                appointmentId: $entry->appointment_id,
                medicalHistoryEntryId: $entry->id,
            ));

            return $entry;
        });
    }
}
