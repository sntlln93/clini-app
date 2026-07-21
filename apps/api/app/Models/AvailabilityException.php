<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AvailabilityExceptionType;
use App\Support\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['organization_id', 'membership_id', 'type', 'start_at', 'end_at', 'reason'])]
class AvailabilityException extends Model
{
    use BelongsToOrganization;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => AvailabilityExceptionType::class,
            'start_at' => 'datetime',
            'end_at' => 'datetime',
        ];
    }

    public function membership(): BelongsTo
    {
        return $this->belongsTo(Membership::class);
    }
}
