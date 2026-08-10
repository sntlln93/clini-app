<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\Concerns\BelongsToOrganization;
use Carbon\Carbon;
use Database\Factories\AvailabilityFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
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

    /**
     * Slots of the same membership+day_of_week whose range overlaps or
     * touches [$start, $end] — a closed comparison so adjacency counts too
     * (start_time <= :end AND end_time >= :start). Values are normalized to
     * `H:i:s` before binding, since comparing e.g. `'09:00'` against
     * `'09:00:00'` as raw strings would misbehave. $ignoreId excludes the
     * row being updated from its own collision check.
     *
     * @param  Builder<Availability>  $query
     * @return Builder<Availability>
     */
    public function scopeOverlappingOrAdjacent(
        Builder $query,
        int $membershipId,
        int $dayOfWeek,
        string $start,
        string $end,
        ?int $ignoreId,
    ): Builder {
        $query->where('membership_id', $membershipId)
            ->where('day_of_week', $dayOfWeek)
            ->where('start_time', '<=', Carbon::parse($end)->format('H:i:s'))
            ->where('end_time', '>=', Carbon::parse($start)->format('H:i:s'));

        if ($ignoreId !== null) {
            $query->whereKeyNot($ignoreId);
        }

        return $query;
    }
}
