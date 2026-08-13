<?php

declare(strict_types=1);

namespace App\Actions\ClinicalNotes;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalNotes\ClinicalNoteDraftData;
use App\Models\ClinicalNote;

/**
 * @implements Action<ClinicalNoteDraftData>
 */
class WriteClinicalNoteAction implements Action
{
    /**
     * @param  ClinicalNoteDraftData  $dto
     */
    public function handle(Data $dto): ClinicalNote
    {
        return ClinicalNote::create([
            'organization_id' => $dto->organizationId,
            'appointment_id' => $dto->appointmentId,
            'membership_id' => $dto->membershipId,
            'body' => $dto->body,
        ]);
    }
}
