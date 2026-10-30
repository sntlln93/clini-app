<?php

declare(strict_types=1);

namespace App\Actions\MedicalHistory;

use App\Actions\ClinicalAccess\RecordClinicalAccessAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\MedicalHistory\MedicalHistoryEntryWithdrawalData;
use App\Enums\ClinicalAccessAction;
use App\Exceptions\MedicalHistory\MedicalHistoryEntryWithdrawnException;
use App\Models\MedicalHistoryEntry;
use Illuminate\Support\Facades\DB;

/**
 * Says the entry no longer applies (#361): it stays in the history with every version, marked as withdrawn, as an
 * annulled note does (ADR 0019).
 *
 * @implements Action<MedicalHistoryEntryWithdrawalData>
 */
class WithdrawMedicalHistoryEntryAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  MedicalHistoryEntryWithdrawalData  $dto
     */
    public function handle(Data $dto): MedicalHistoryEntry
    {
        return DB::transaction(function () use ($dto): MedicalHistoryEntry {
            $entry = MedicalHistoryEntry::query()->lockForUpdate()->findOrFail($dto->entryId);

            if ($entry->withdrawal()->exists()) {
                throw new MedicalHistoryEntryWithdrawnException($entry->id);
            }

            $entry->withdrawal()->create([
                'membership_id' => $dto->membershipId,
                'reason' => $dto->reason,
            ]);

            $this->record->handle(new ClinicalAccessEntryData(
                organizationId: $entry->organization_id,
                membershipId: $dto->membershipId,
                patientId: $entry->patient_id,
                action: ClinicalAccessAction::MedicalHistoryWithdrawn,
                appointmentId: $entry->appointment_id,
                medicalHistoryEntryId: $entry->id,
            ));

            return $entry;
        });
    }
}
