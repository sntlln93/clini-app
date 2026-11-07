<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\EncryptedClinicalText;
use App\Enums\AllergySeverity;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The text of one background entry: version 1 is what was recorded first, and every amendment adds the next one. An
 * allergy's description is its substance, and only an allergy carries a reaction and a severity.
 *
 * @property string $description never null, which its encrypted cast (#391) can't tell Larastan
 */
#[Fillable([
    'medical_history_entry_id',
    'version',
    'membership_id',
    'description',
    'reaction',
    'severity',
    'approximate_date',
    'reason',
])]
class MedicalHistoryEntryVersion extends Model
{
    public const null UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'description' => EncryptedClinicalText::class,
            'reaction' => EncryptedClinicalText::class,
            'approximate_date' => EncryptedClinicalText::class,
            'reason' => EncryptedClinicalText::class,
            'version' => 'integer',
            'severity' => AllergySeverity::class,
        ];
    }

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
