<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Marks that an organization was warned about the Free plan's monthly
 * appointment limit for one month (#238). Append-only; BookAppointmentAction
 * is its only writer.
 */
#[Fillable(['organization_id', 'month'])]
class AppointmentLimitWarning extends Model
{
    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'month' => 'immutable_date',
        ];
    }
}
