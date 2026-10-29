<?php

declare(strict_types=1);

namespace App\Actions\ClinicalNotes;

use App\Actions\ClinicalAccess\RecordClinicalAccessAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\ClinicalNotes\ClinicalNoteDraftData;
use App\Enums\ClinicalAccessAction;
use App\Models\ClinicalNote;
use App\Support\ClinicalNoteDiagnoses;
use Illuminate\Support\Facades\DB;

/**
 * The text and its diagnoses are the note's version 1 (ADR 0019, #324), and
 * the access log records who wrote it (#325).
 *
 * @implements Action<ClinicalNoteDraftData>
 */
class WriteClinicalNoteAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  ClinicalNoteDraftData  $dto
     */
    public function handle(Data $dto): ClinicalNote
    {
        return DB::transaction(function () use ($dto): ClinicalNote {
            $clinicalNote = ClinicalNote::create([
                'organization_id' => $dto->organizationId,
                'appointment_id' => $dto->appointmentId,
                'patient_id' => $dto->patientId,
                'membership_id' => $dto->membershipId,
            ]);

            $version = $clinicalNote->versions()->create([
                'version' => 1,
                'membership_id' => $dto->membershipId,
                'body' => $dto->body,
            ]);

            ClinicalNoteDiagnoses::record($version, $dto->icd10CodeIds);

            $this->record->handle(new ClinicalAccessEntryData(
                organizationId: $dto->organizationId,
                membershipId: $dto->membershipId,
                patientId: $dto->patientId,
                action: ClinicalAccessAction::NoteWritten,
                appointmentId: $dto->appointmentId,
                clinicalNoteId: $clinicalNote->id,
            ));

            return $clinicalNote;
        });
    }
}
