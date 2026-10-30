<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BloodType;
use App\Support\Concerns\BelongsToOrganization;
use Database\Factories\BloodTypeRecordFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The patient's blood type as one professional recorded it during an appointment (#361, ADR 0027). The latest record
 * is the current value; changing it records a new one, so every earlier value stays with its author.
 */
#[Fillable(['organization_id', 'appointment_id', 'patient_id', 'membership_id', 'blood_type', 'reason'])]
class BloodTypeRecord extends Model
{
    /** @use HasFactory<BloodTypeRecordFactory> */
    use BelongsToOrganization, HasFactory;

    public const null UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'blood_type' => BloodType::class,
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
}
