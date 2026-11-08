<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\HealthProfession;
use App\Enums\ProfessionalLicenseStatus;
use Database\Factories\SpecialtyFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Query\Builder as QueryBuilder;

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
        $query->addSelect(['backed' => fn (QueryBuilder $backing) => $backing
            ->selectRaw('count(*) > 0')
            ->from('professional_licenses')
            ->whereColumn('professional_licenses.user_id', 'professional_specialties.user_id')
            ->whereColumn('professional_licenses.specialty_id', 'specialties.id')
            ->where('professional_licenses.status', ProfessionalLicenseStatus::Verified->value)
            ->whereNotNull('professional_licenses.added_at'),
        ])->withCasts(['backed' => 'boolean']);
    }

    /**
     * @return Builder<ProfessionalLicense>
     */
    private static function backingLicenses(): Builder
    {
        return ProfessionalLicense::query()
            ->select('professional_licenses.specialty_id')
            ->where('professional_licenses.status', ProfessionalLicenseStatus::Verified)
            ->whereNotNull('professional_licenses.added_at')
            ->whereNotNull('professional_licenses.specialty_id');
    }
}
