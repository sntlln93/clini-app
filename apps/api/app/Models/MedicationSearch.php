<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * A term the catalog asked the national vademecum for (#377), so it can tell which terms it already holds: never who
 * searched it.
 */
#[WithoutTimestamps]
#[Fillable(['term', 'complete', 'searched_at'])]
class MedicationSearch extends Model
{
    /**
     * How long a search keeps covering its term before the catalog asks ANMAT again.
     */
    public const int COVERAGE_DAYS = 30;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'complete' => 'boolean',
            'searched_at' => 'immutable_datetime',
        ];
    }

    /**
     * Recent searches that hold everything the folded term could find: the same term, or a shorter one inside it
     * that came back in full.
     *
     * @param  Builder<MedicationSearch>  $query
     * @return Builder<MedicationSearch>
     */
    public function scopeCovering(Builder $query, string $foldedTerm): Builder
    {
        return $query
            ->where('searched_at', '>', now()->subDays(self::COVERAGE_DAYS)->utc())
            ->where(fn (Builder $query) => $query
                ->where('term', $foldedTerm)
                ->orWhere(fn (Builder $query) => $query
                    ->where('complete', true)
                    ->whereRaw('strpos(?, term) > 0', [$foldedTerm])));
    }
}
