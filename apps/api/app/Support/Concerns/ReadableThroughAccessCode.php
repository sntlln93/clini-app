<?php

declare(strict_types=1);

namespace App\Support\Concerns;

use App\Support\ClinicalAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;

/** A clinical record another professional reads only through the patient's code (ADR 0029). */
trait ReadableThroughAccessCode
{
    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeReadableBy(Builder $query, int $membershipId): Builder
    {
        $table = $this->getTable();

        return $query->where(fn (Builder $query) => $query
            ->where("{$table}.membership_id", $membershipId)
            ->orWhereExists(fn (QueryBuilder $codes) => ClinicalAccess::redeemedCodes($codes, $membershipId)
                ->whereColumn('patient_access_codes.patient_id', "{$table}.patient_id")));
    }
}
