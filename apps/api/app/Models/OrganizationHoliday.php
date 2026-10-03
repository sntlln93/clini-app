<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\OrganizationHolidayFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A closure day an organization sets for itself, on top of the shared
 * Holiday catalog. The catalog sync never writes this table.
 */
#[Fillable(['organization_id', 'date', 'name'])]
class OrganizationHoliday extends Model
{
    /** @use HasFactory<OrganizationHolidayFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'immutable_date',
        ];
    }

    /**
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
