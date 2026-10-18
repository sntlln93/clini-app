<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\Concerns\BelongsToOrganization;
use Database\Factories\PrescriptionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * The medication a professional indicated during one appointment, kept as an
 * internal record of the clinical history (issue #319). Clini never issues a
 * prescription: valid ones are electronic, through a ReNaPDiS platform.
 * Append-only like clinical notes (#323, ADR 0019): the items live in its
 * versions, and a correction adds one.
 */
#[Fillable(['organization_id', 'appointment_id', 'patient_id', 'membership_id', 'issued_at'])]
class Prescription extends Model
{
    /** @use HasFactory<PrescriptionFactory> */
    use BelongsToOrganization, HasFactory;

    public const null UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
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
     * @return BelongsTo<Membership, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(Membership::class, 'membership_id');
    }

    /**
     * Oldest first, so the last one holds the current items.
     *
     * @return HasMany<PrescriptionVersion, $this>
     */
    public function versions(): HasMany
    {
        return $this->hasMany(PrescriptionVersion::class)->orderBy('version');
    }
}
