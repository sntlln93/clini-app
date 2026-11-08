<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\HealthProfession;
use Database\Factories\SpecialtyFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A specialty of a profession as the national professional registry writes it, or the profession itself when the
 * registry answers it without one (#387, ADR 0038). Only `App\Support\RegistrySpecialtyCatalog` adds rows, from a
 * registry answer; nothing edits or deletes them.
 *
 * @property HealthProfession $profession
 */
class Specialty extends Model
{
    /** @use HasFactory<SpecialtyFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'profession' => HealthProfession::class,
        ];
    }

    /**
     * The specialties a user's verified licenses in Clini back: what a practice may offer them with (#387).
     *
     * @param  Builder<self>  $query
     */
    public function scopeBackedFor(Builder $query, int $userId): void
    {
        $query->whereIn('specialties.id', self::backingLicenses()->where('professional_licenses.user_id', $userId));
    }

    /**
     * Adds `backed` to a practice's specialties: whether a verified license of the professional still backs it. The
     * query must join `professional_specialties`, as `Membership::specialties()` does.
     *
     * @param  Builder<self>  $query
     */
    public function scopeWithBacking(Builder $query): void
    {
        $query->addSelect(['backed' => ProfessionalLicense::query()
            ->backing()
            ->selectRaw('count(*) > 0')
            ->whereColumn('professional_licenses.user_id', 'professional_specialties.user_id')
            ->whereColumn('professional_licenses.specialty_id', 'specialties.id'),
        ])->withCasts(['backed' => 'boolean']);
    }

    /**
     * @return Builder<ProfessionalLicense>
     */
    private static function backingLicenses(): Builder
    {
        return ProfessionalLicense::query()
            ->select('professional_licenses.specialty_id')
            ->backing()
            ->whereNotNull('professional_licenses.specialty_id');
    }
}
