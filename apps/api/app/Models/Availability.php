<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\Concerns\BelongsToOrganization;
use Database\Factories\AvailabilityFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['organization_id', 'membership_id', 'day_of_week', 'start_time', 'end_time'])]
class Availability extends Model
{
    /** @use HasFactory<AvailabilityFactory> */
    use BelongsToOrganization, HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Membership, $this>
     */
    public function membership(): BelongsTo
    {
        return $this->belongsTo(Membership::class);
    }
}
