<?php

declare(strict_types=1);

namespace App\Actions\ClinicalNotes;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalNotes\ClinicalNoteAmendmentData;
use App\Exceptions\ClinicalNotes\ClinicalNoteAmendmentUnchangedException;
use App\Exceptions\ClinicalNotes\ClinicalNoteAnnulledException;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteDiagnosis;
use App\Models\ClinicalNoteVersion;
use App\Support\ClinicalNoteDiagnoses;
use Illuminate\Support\Facades\DB;

/**
 * Adds the next version, with the whole new text and diagnoses, and keeps
 * every previous one (ADR 0019, #324). The note row is locked so two
 * amendments can't both claim the same version, and so the diagnoses it
 * keeps are read from the version it really amends.
 *
 * @implements Action<ClinicalNoteAmendmentData>
 */
class AmendClinicalNoteAction implements Action
{
    /**
     * @param  ClinicalNoteAmendmentData  $dto
     */
    public function handle(Data $dto): ClinicalNote
    {
        return DB::transaction(function () use ($dto): ClinicalNote {
            $clinicalNote = ClinicalNote::query()->lockForUpdate()->findOrFail($dto->clinicalNoteId);

            if ($clinicalNote->annulment()->exists()) {
                throw new ClinicalNoteAnnulledException($clinicalNote->id);
            }

            /** @var ClinicalNoteVersion $current */
            $current = $clinicalNote->versions()->reorder('version', 'desc')->with('diagnoses')->firstOrFail();

            $currentCodeIds = array_values($current->diagnoses
                ->map(fn (ClinicalNoteDiagnosis $diagnosis): int => $diagnosis->icd10_code_id)
                ->all());
            $newCodeIds = $dto->icd10CodeIds ?? $currentCodeIds;

            if ($current->body === $dto->body && $currentCodeIds === $newCodeIds) {
                throw new ClinicalNoteAmendmentUnchangedException($clinicalNote->id, $current->version);
            }

            $version = $clinicalNote->versions()->create([
                'version' => $current->version + 1,
                'membership_id' => $dto->membershipId,
                'body' => $dto->body,
                'reason' => $dto->reason,
            ]);

            ClinicalNoteDiagnoses::record($version, $newCodeIds, $current->diagnoses);

            return $clinicalNote;
        });
    }
}
