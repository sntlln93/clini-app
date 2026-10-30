<?php

declare(strict_types=1);

namespace App\Actions\MedicalHistory;

use App\Actions\ClinicalAccess\RecordClinicalAccessAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\MedicalHistory\MedicalHistoryEntryAmendmentData;
use App\Enums\ClinicalAccessAction;
use App\Exceptions\MedicalHistory\MedicalHistoryAmendmentUnchangedException;
use App\Exceptions\MedicalHistory\MedicalHistoryEntryWithdrawnException;
use App\Models\MedicalHistoryEntry;
use App\Models\MedicalHistoryEntryVersion;
use Illuminate\Support\Facades\DB;

/**
 * Adds the next version with the whole new text and keeps every previous one (ADR 0019). The category stays: an
 * allergy recorded as an antecedent is withdrawn and recorded again.
 *
 * @implements Action<MedicalHistoryEntryAmendmentData>
 */
class AmendMedicalHistoryEntryAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  MedicalHistoryEntryAmendmentData  $dto
     */
    public function handle(Data $dto): MedicalHistoryEntry
    {
        return DB::transaction(function () use ($dto): MedicalHistoryEntry {
            $entry = MedicalHistoryEntry::query()->lockForUpdate()->findOrFail($dto->entryId);

            if ($entry->withdrawal()->exists()) {
                throw new MedicalHistoryEntryWithdrawnException($entry->id);
            }

            /** @var MedicalHistoryEntryVersion $current */
            $current = $entry->versions()->reorder('version', 'desc')->firstOrFail();
            $content = $dto->content->forCategory($entry->category)->toArray();
            $currentContent = [
                'description' => $current->description,
                'reaction' => $current->reaction,
                'severity' => $current->severity?->value,
                'approximate_date' => $current->approximate_date,
            ];

            if ($currentContent === $content) {
                throw new MedicalHistoryAmendmentUnchangedException($entry->id);
            }

            $entry->versions()->create([
                'version' => $current->version + 1,
                'membership_id' => $dto->membershipId,
                'reason' => $dto->reason,
                ...$content,
            ]);

            $this->record->handle(new ClinicalAccessEntryData(
                organizationId: $entry->organization_id,
                membershipId: $dto->membershipId,
                patientId: $entry->patient_id,
                action: ClinicalAccessAction::MedicalHistoryAmended,
                appointmentId: $entry->appointment_id,
                medicalHistoryEntryId: $entry->id,
            ));

            return $entry;
        });
    }
}
