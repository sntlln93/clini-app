<?php

declare(strict_types=1);

namespace App\Actions\ClinicalNotes;

use App\Actions\ClinicalAccess\RecordClinicalAccessAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\ClinicalNotes\ClinicalNoteAnnulmentData;
use App\Enums\ClinicalAccessAction;
use App\Exceptions\ClinicalNotes\ClinicalNoteAnnulledException;
use App\Models\ClinicalNote;
use Illuminate\Support\Facades\DB;

/**
 * Takes the place of deleting a note: it stays in the history with every
 * version, marked as annulled (ADR 0019).
 *
 * @implements Action<ClinicalNoteAnnulmentData>
 */
class AnnulClinicalNoteAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  ClinicalNoteAnnulmentData  $dto
     */
    public function handle(Data $dto): ClinicalNote
    {
        return DB::transaction(function () use ($dto): ClinicalNote {
            $clinicalNote = ClinicalNote::query()->lockForUpdate()->findOrFail($dto->clinicalNoteId);

            if ($clinicalNote->annulment()->exists()) {
                throw new ClinicalNoteAnnulledException($clinicalNote->id);
            }

            $clinicalNote->annulment()->create([
                'membership_id' => $dto->membershipId,
                'reason' => $dto->reason,
            ]);

            $this->record->handle(new ClinicalAccessEntryData(
                organizationId: $clinicalNote->organization_id,
                membershipId: $dto->membershipId,
                patientId: $clinicalNote->patient_id,
                action: ClinicalAccessAction::NoteAnnulled,
                appointmentId: $clinicalNote->appointment_id,
                clinicalNoteId: $clinicalNote->id,
            ));

            return $clinicalNote;
        });
    }
}
