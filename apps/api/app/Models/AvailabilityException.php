<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AvailabilityExceptionType;
use App\Support\Concerns\BelongsToOrganization;
use Carbon\CarbonInterface;
use Database\Factories\AvailabilityExceptionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['organization_id', 'membership_id', 'type', 'start_at', 'end_at', 'reason'])]
class AvailabilityException extends Model
{
    /** @use HasFactory<AvailabilityExceptionFactory> */
    use BelongsToOrganization, HasFactory;

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

    /**
     * @return BelongsTo<Membership, $this>
     */
    public function membership(): BelongsTo
    {
        return $this->belongsTo(Membership::class);
    }

    /**
     * Exceptions of the same organization+membership_id and `type` whose
     * range overlaps or touches [$start, $end] — a closed comparison so
     * adjacency counts too (start_at <= :end AND end_at >= :start).
     * membership_id is matched exactly: null (org-wide) only collides with
     * another null row. $ignoreId excludes the row being updated from its
     * own collision check. Bypasses the model's implicit
     * BelongsToOrganization global scope and re-applies it explicitly
     * against $organizationId, same reasoning as BelongsToCurrentOrganization.
     *
     * @param  Builder<AvailabilityException>  $query
     * @return Builder<AvailabilityException>
     */
    public function scopeOverlappingOrAdjacentSameType(
        Builder $query,
        int $organizationId,
        ?int $membershipId,
        AvailabilityExceptionType $type,
        CarbonInterface $start,
        CarbonInterface $end,
        ?int $ignoreId,
    ): Builder {
        $query->withoutGlobalScope('organization')
            ->where('organization_id', $organizationId)
            ->where('type', $type->value)
            ->where('start_at', '<=', $end)
            ->where('end_at', '>=', $start);

        if ($membershipId === null) {
            $query->whereNull('membership_id');
        } else {
            $query->where('membership_id', $membershipId);
        }

        if ($ignoreId !== null) {
            $query->whereKeyNot($ignoreId);
        }

        return $query;
    }

    /**
     * Exceptions of the same organization+membership_id but a *different*
     * `type` that strictly overlap [$start, $end] — an open comparison, so
     * touching at the boundary is not a conflict (start_at < :end AND
     * end_at > :start). Same membership_id/global-scope handling as
     * scopeOverlappingOrAdjacentSameType().
     *
     * @param  Builder<AvailabilityException>  $query
     * @return Builder<AvailabilityException>
     */
    public function scopeStrictlyOverlappingOtherType(
        Builder $query,
        int $organizationId,
        ?int $membershipId,
        AvailabilityExceptionType $type,
        CarbonInterface $start,
        CarbonInterface $end,
        ?int $ignoreId,
    ): Builder {
        $query->withoutGlobalScope('organization')
            ->where('organization_id', $organizationId)
            ->where('type', '!=', $type->value)
            ->where('start_at', '<', $end)
            ->where('end_at', '>', $start);

        if ($membershipId === null) {
            $query->whereNull('membership_id');
        } else {
            $query->where('membership_id', $membershipId);
        }

        if ($ignoreId !== null) {
            $query->whereKeyNot($ignoreId);
        }

        return $query;
    }
}
