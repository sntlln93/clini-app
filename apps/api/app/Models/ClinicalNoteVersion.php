<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ClinicalNoteVersionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One text of a clinical note: version 1 is what was written first, and
 * every amendment adds the next one with its optional reason.
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
     * @return BelongsTo<Membership, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(Membership::class, 'membership_id');
    }
}
