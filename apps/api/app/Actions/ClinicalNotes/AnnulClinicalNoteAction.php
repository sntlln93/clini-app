<?php

declare(strict_types=1);

namespace App\Actions\ClinicalNotes;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalNotes\ClinicalNoteAnnulmentData;
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

            return $clinicalNote;
        });
    }
}
