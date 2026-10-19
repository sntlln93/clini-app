<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ClinicalNoteVersionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One text of a clinical note, with its ICD-10 diagnoses (#324): version 1
 * is what was written first, and every amendment adds the next one with its
 * optional reason.
 */
#[Fillable(['clinical_note_id', 'version', 'membership_id', 'body', 'reason'])]
class ClinicalNoteVersion extends Model
{
    /** @use HasFactory<ClinicalNoteVersionFactory> */
    use HasFactory;

    public const null UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'version' => 'integer',
        ];
    }

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

    /**
     * In the order the professional listed them.
     *
     * @return HasMany<ClinicalNoteDiagnosis, $this>
     */
    public function diagnoses(): HasMany
    {
        return $this->hasMany(ClinicalNoteDiagnosis::class)->orderBy('position');
    }
}
