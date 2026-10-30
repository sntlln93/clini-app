<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\MedicalHistoryCategory;
use App\Support\Concerns\BelongsToOrganization;
use App\Support\Concerns\ReadableThroughAccessCode;
use Database\Factories\MedicalHistoryEntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * One allergy or one personal, family or surgical antecedent of the patient, recorded during an appointment (#361, ADR
 * 0027). Append-only like the notes (ADR 0019): its text lives in its versions, a correction adds one, and a
 * withdrawal says it no longer applies without erasing it.
 */
#[Fillable(['organization_id', 'appointment_id', 'patient_id', 'membership_id', 'category'])]
class MedicalHistoryEntry extends Model
{
    /** @use HasFactory<MedicalHistoryEntryFactory> */
    use BelongsToOrganization, HasFactory, ReadableThroughAccessCode;

    public const null UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'category' => MedicalHistoryCategory::class,
        ];
    }

    /**
     * @return BelongsTo<Appointment, $this>
     */
    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
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
     * Oldest first, so the last one holds the current text.
     *
     * @return HasMany<MedicalHistoryEntryVersion, $this>
     */
    public function versions(): HasMany
    {
        return $this->hasMany(MedicalHistoryEntryVersion::class)->orderBy('version');
    }

    /**
     * @return HasOne<MedicalHistoryEntryWithdrawal, $this>
     */
    public function withdrawal(): HasOne
    {
        return $this->hasOne(MedicalHistoryEntryWithdrawal::class);
    }
}
