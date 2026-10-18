<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An ICD-10 diagnosis of one note version (#324, ADR 0020). It copies the
 * catalog's code and description as they were when the version was
 * written, and it is append-only like the version itself.
 */
#[Fillable(['clinical_note_version_id', 'position', 'icd10_code_id', 'code', 'description'])]
class ClinicalNoteDiagnosis extends Model
{
    public $timestamps = false;

    protected $table = 'clinical_note_diagnoses';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'position' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<ClinicalNoteVersion, $this>
     */
    public function version(): BelongsTo
    {
        return $this->belongsTo(ClinicalNoteVersion::class, 'clinical_note_version_id');
    }

    /**
     * @return BelongsTo<Icd10Code, $this>
     */
    public function icd10Code(): BelongsTo
    {
        return $this->belongsTo(Icd10Code::class)->withTrashed();
    }
}
