<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Append-only: no updated_at, and LookUpPatientAction is its only writer (#365).
 */
#[Fillable(['organization_id', 'membership_id', 'patient_id'])]
class PatientLookup extends Model
{
    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'immutable_datetime',
        ];
    }
}
