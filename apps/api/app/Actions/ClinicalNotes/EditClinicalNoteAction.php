<?php

declare(strict_types=1);

namespace App\Actions\ClinicalNotes;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalNotes\ClinicalNoteEditionData;
use App\Models\ClinicalNote;

/**
 * @implements Action<ClinicalNoteEditionData>
 */
class EditClinicalNoteAction implements Action
{
    /**
     * @param  ClinicalNoteEditionData  $dto
     */
    public function handle(Data $dto): ClinicalNote
    {
        $clinicalNote = ClinicalNote::query()->findOrFail($dto->clinicalNoteId);

        $clinicalNote->update([
            'body' => $dto->body,
        ]);

        return $clinicalNote;
    }
}
