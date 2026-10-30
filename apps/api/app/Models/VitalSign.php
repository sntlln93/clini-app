<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\Concerns\BelongsToOrganization;
use App\Support\Concerns\ReadableThroughAccessCode;
use Database\Factories\VitalSignFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * One measurement of the clinical history, taken during an appointment (#361). Append-only like the notes (ADR 0019):
 * the values live in its versions, a correction adds one, and an annulment takes it out of the series.
 */
#[Fillable(['organization_id', 'appointment_id', 'patient_id', 'membership_id', 'measured_at'])]
class VitalSign extends Model
{
    /** @use HasFactory<VitalSignFactory> */
    use BelongsToOrganization, HasFactory, ReadableThroughAccessCode;

    public const null UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'measured_at' => 'datetime',
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
     * @return BelongsTo<Patient, $this>
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
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
     * Oldest first, so the last one holds the current values.
     *
     * @return HasMany<VitalSignVersion, $this>
     */
    public function versions(): HasMany
    {
        return $this->hasMany(VitalSignVersion::class)->orderBy('version');
    }

    /**
     * @return HasOne<VitalSignAnnulment, $this>
     */
    public function annulment(): HasOne
    {
        return $this->hasOne(VitalSignAnnulment::class);
    }
}
