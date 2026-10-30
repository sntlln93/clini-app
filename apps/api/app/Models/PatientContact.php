<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PatientContactType;
use Database\Factories\PatientContactFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['patient_id', 'type', 'value', 'label', 'position', 'needs_confirmation', 'created_by'])]
class PatientContact extends Model
{
    /** @use HasFactory<PatientContactFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => PatientContactType::class,
            'position' => 'integer',
            'needs_confirmation' => 'boolean',
        ];
    }

    /**
     * Where an appointment reminder goes (#365): every email contact, except one an anonymous booking added that no
     * practice has confirmed yet.
     *
     * @param  Builder<PatientContact>  $query
     * @return Builder<PatientContact>
     */
    public function scopeForReminders(Builder $query): Builder
    {
        return $query->where('type', PatientContactType::Email)->where('needs_confirmation', false);
    }

    /**
     * @return BelongsTo<Patient, $this>
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
