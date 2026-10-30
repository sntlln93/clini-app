<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Marks a background entry as no longer applying without erasing it (#361): an allergy that went away, an antecedent
 * recorded by mistake. The entry stays in the history with every version, and it can no longer be amended.
 */
#[Fillable(['medical_history_entry_id', 'membership_id', 'reason'])]
class MedicalHistoryEntryWithdrawal extends Model
{
    public const null UPDATED_AT = null;

    /**
     * @return BelongsTo<MedicalHistoryEntry, $this>
     */
    public function entry(): BelongsTo
    {
        return $this->belongsTo(MedicalHistoryEntry::class, 'medical_history_entry_id');
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
