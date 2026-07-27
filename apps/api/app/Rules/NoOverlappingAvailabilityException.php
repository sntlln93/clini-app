<?php

declare(strict_types=1);

namespace App\Rules;

use App\Models\AvailabilityException;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Rejects an exception's end_at when it overlaps another exception of the
 * same organization+membership_id (half-open interval comparison:
 * start_at < :end AND end_at > :start). membership_id is matched exactly —
 * null (org-wide) only collides with another null row, never with a
 * specific membership's row. $ignoreId excludes the row being updated from
 * its own collision check.
 *
 * The organization filter bypasses the model's implicit
 * BelongsToOrganization global scope and re-applies it explicitly against
 * the given $organizationId, same reasoning as BelongsToCurrentOrganization.
 */
final readonly class NoOverlappingAvailabilityException implements ValidationRule
{
    public function __construct(
        private ?int $membershipId,
        private ?string $startAt,
        private ?int $ignoreId,
        private int $organizationId,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($this->startAt === null) {
            return;
        }

        $query = AvailabilityException::query()
            ->withoutGlobalScope('organization')
            ->where('organization_id', $this->organizationId)
            ->where('start_at', '<', $value)
            ->where('end_at', '>', $this->startAt);

        if ($this->membershipId === null) {
            $query->whereNull('membership_id');
        } else {
            $query->where('membership_id', $this->membershipId);
        }

        if ($this->ignoreId !== null) {
            $query->whereKeyNot($this->ignoreId);
        }

        if ($query->exists()) {
            $fail('El horario se superpone con otra excepción existente.');
        }
    }
}
