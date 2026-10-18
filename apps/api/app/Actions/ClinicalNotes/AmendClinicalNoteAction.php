<?php

declare(strict_types=1);

namespace App\Actions\ClinicalNotes;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalNotes\ClinicalNoteAmendmentData;
use App\Exceptions\ClinicalNotes\ClinicalNoteAmendmentUnchangedException;
use App\Exceptions\ClinicalNotes\ClinicalNoteAnnulledException;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteVersion;
use Illuminate\Support\Facades\DB;

/**
 * Adds the next version and keeps every previous one (ADR 0019). The note
 * row is locked so two amendments can't both claim the same version.
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
            $current = $clinicalNote->versions()->reorder('version', 'desc')->firstOrFail();

            if ($current->body === $dto->body) {
                throw new ClinicalNoteAmendmentUnchangedException($clinicalNote->id, $current->version);
            }

            $clinicalNote->versions()->create([
                'version' => $current->version + 1,
                'membership_id' => $dto->membershipId,
                'body' => $dto->body,
                'reason' => $dto->reason,
            ]);

            return $clinicalNote;
        });
    }
}
