<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\Icd10CodeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One entry of the ICD-10 catalog (#324, ADR 0020): global, read-only
 * reference data the external catalog app owns, like specialties. A
 * retired code is soft-deleted so the diagnoses that used it keep pointing
 * at it.
 */
#[Fillable(['code', 'description'])]
class Icd10Code extends Model
{
    /** @use HasFactory<Icd10CodeFactory> */
    use HasFactory, SoftDeletes;

    /**
     * Spanish accented letters and what they match, for searching without
     * accents: the same pairs go to PHP's strtr() and SQL's translate().
     */
    private const array UNACCENTED = ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n'];

    /**
     * Codes starting with the term (typed with or without its dot) and
     * descriptions containing it, both ignoring case and accents; code
     * matches come first.
     *
     * @param  Builder<Icd10Code>  $query
     * @return Builder<Icd10Code>
     */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        // The term is matched literally: LIKE's wildcards are escaped.
        $literal = addcslashes($term, '\\%_');
        $code = str_replace('.', '', $literal).'%';
        $description = '%'.strtr(mb_strtolower($literal), self::UNACCENTED).'%';
        $codeMatch = "replace(code, '.', '') ilike ?";
        $accented = implode('', array_keys(self::UNACCENTED));
        $unaccented = implode('', self::UNACCENTED);

        return $query
            ->where(function (Builder $query) use ($code, $description, $codeMatch, $accented, $unaccented) {
                $query->whereRaw($codeMatch, [$code])
                    ->orWhereRaw('translate(lower(description), ?, ?) like ?', [$accented, $unaccented, $description]);
            })
            ->orderByRaw("CASE WHEN {$codeMatch} THEN 0 ELSE 1 END", [$code])
            ->orderBy('code');
    }
}
