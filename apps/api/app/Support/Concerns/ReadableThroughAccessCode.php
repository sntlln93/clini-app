<?php

declare(strict_types=1);

namespace App\Support\Concerns;

use App\Support\ClinicalAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * A clinical record of the patient's history, which is the patient's (#364, ADR 0029): its author reads it, and
 * another professional only through the code the patient shared with them.
 */
trait ReadableThroughAccessCode
{
    /**
     * What the membership reads: what it wrote, and every other author's only while it holds a redeemed, still valid
     * code of that patient.
     *
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
