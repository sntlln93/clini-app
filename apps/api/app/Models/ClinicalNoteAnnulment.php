<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Marks a clinical note as void without erasing it: the note and every
 * version stay in the history, and it can no longer be amended.
 */
#[Fillable(['clinical_note_id', 'membership_id', 'reason'])]
class ClinicalNoteAnnulment extends Model
{
    public const null UPDATED_AT = null;

    /**
     * @return BelongsTo<ClinicalNote, $this>
     */
    public function clinicalNote(): BelongsTo
    {
        return $this->belongsTo(ClinicalNote::class);
    }

    /**
     * Deactivating a membership soft-deletes it, and the record keeps its author.
     *
     * @return BelongsTo<Membership, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(Membership::class, 'membership_id')->withTrashed();
    }
}
