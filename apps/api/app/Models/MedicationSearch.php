<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\FoldedText;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * A term the catalog asked the medication source for, and when (#377): never who searched it.
 */
#[WithoutTimestamps]
#[Fillable(['term', 'searched_at'])]
class MedicationSearch extends Model
{
    /**
     * How long a search keeps covering its term before the catalog asks the source again.
     */
    public const int COVERAGE_DAYS = 30;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'searched_at' => 'immutable_datetime',
        ];
    }

    /**
     * The term a search is recorded under and asked for. The source matches without case or accented vowels (probed,
     * ADR 0031); whether it tells «ñ» from «n» wasn't, so the key keeps «ñ» apart: «niño» and «nino» are asked one
     * each, and neither ever covers what only the other would find.
     */
    public static function key(string $typed): string
    {
        return FoldedText::foldVowels($typed);
    }

    /**
     * Recent searches that hold everything the term's `key()` could find: the same key, or a shorter one inside it.
     * The source matches a contiguous substring and answers whole, so a longer term never finds anything a term
     * inside it didn't.
     *
     * @param  Builder<MedicationSearch>  $query
     * @return Builder<MedicationSearch>
     */
    public function scopeCovering(Builder $query, string $key): Builder
    {
        return $query
            ->where('searched_at', '>', now()->subDays(self::COVERAGE_DAYS)->utc())
            ->whereRaw('strpos(?, term) > 0', [$key]);
    }
}
