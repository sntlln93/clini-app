<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\DocumentType;
use App\Enums\Sex;
use Database\Factories\PatientFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'name',
    'email',
    'phone',
    'document_type',
    'document_number',
    'sex',
    'birth_date',
    'insurance_provider_id',
    'insurance_member_number',
    'created_by',
])]
class Patient extends Model
{
    /** @use HasFactory<PatientFactory> */
    use HasFactory, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'document_type' => DocumentType::class,
            'sex' => Sex::class,
            'birth_date' => 'date',
        ];
    }

    /**
     * @return BelongsTo<InsuranceProvider, $this>
     */
    public function insuranceProvider(): BelongsTo
    {
        return $this->belongsTo(InsuranceProvider::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<Appointment, $this>
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    /**
     * @return BelongsToMany<Organization, $this>
     */
    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'organization_patient')->withTimestamps();
    }

    /**
     * Same normalization as the patients_insurance_member_number_unique index: separators and letter case don't make a different number.
     *
     * @param  Builder<Patient>  $query
     * @return Builder<Patient>
     */
    public function scopeWhereInsuranceMemberNumber(Builder $query, int $insuranceProviderId, string $memberNumber): Builder
    {
        return $query->where('insurance_provider_id', $insuranceProviderId)
            ->whereRaw(
                "upper(regexp_replace(insurance_member_number, '[^[:alnum:]]', '', 'g')) = upper(regexp_replace(?, '[^[:alnum:]]', '', 'g'))",
                [$memberNumber],
            );
    }

    /**
     * @param  Builder<Patient>  $query
     * @return Builder<Patient>
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if ($term === null || $term === '') {
            return $query;
        }

        // Member numbers are typed with dashes, slashes or spaces at will, so they match on letters and digits alone.
        $memberNumber = preg_replace('/[^\pL\pN]/u', '', $term) ?? '';

        return $query->where(function (Builder $query) use ($term, $memberNumber) {
            $query->where('name', 'ilike', "%{$term}%")
                ->orWhere('document_number', 'like', "%{$term}%");

            if ($memberNumber !== '') {
                $query->orWhereRaw(
                    "regexp_replace(insurance_member_number, '[^[:alnum:]]', '', 'g') ilike ?",
                    ["%{$memberNumber}%"],
                );
            }
        });
    }
}
