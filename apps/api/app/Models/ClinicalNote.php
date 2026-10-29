<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\Concerns\BelongsToOrganization;
use Database\Factories\ClinicalNoteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Part of the clinical history, so append-only (#323, ADR 0019): the body
 * lives in its versions, a correction adds one, and an annulment replaces
 * deletion. A database trigger rejects any UPDATE or DELETE of the row.
 * Its patient is always its appointment's, which the database enforces and
 * then keeps from changing (#360).
 */
#[Fillable(['organization_id', 'appointment_id', 'patient_id', 'membership_id'])]
class ClinicalNote extends Model
{
    /** @use HasFactory<ClinicalNoteFactory> */
    use BelongsToOrganization, HasFactory;

    public const null UPDATED_AT = null;

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
     * Oldest first, so the last one is the current text.
     *
     * @return HasMany<ClinicalNoteVersion, $this>
     */
    public function versions(): HasMany
    {
        return $this->hasMany(ClinicalNoteVersion::class)->orderBy('version');
    }

    /**
     * @return HasOne<ClinicalNoteAnnulment, $this>
     */
    public function annulment(): HasOne
    {
        return $this->hasOne(ClinicalNoteAnnulment::class);
    }

    /**
     * Notes of any author about the given patient.
     *
     * @param  Builder<ClinicalNote>  $query
     * @return Builder<ClinicalNote>
     */
    public function scopeForPatient(Builder $query, int $patientId): Builder
    {
        return $query->where('patient_id', $patientId);
    }
}
