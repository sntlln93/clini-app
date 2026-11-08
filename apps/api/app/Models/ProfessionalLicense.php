<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\HealthProfession;
use App\Enums\ProfessionalLicenseMismatch;
use App\Enums\ProfessionalLicenseStatus;
use App\Enums\Province;
use Database\Factories\ProfessionalLicenseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A professional's license, as they declared it, with what the national registry last said about it (#380, ADR 0032).
 * It belongs to the user, not to an organization: the one that counts in a practice is the one from the practice's
 * province. The registry's answer (status, reason, REFEPS code, issuer, specialty, situation, `checked_at`, `attempted_at`) is written
 * only by the verification Action, never mass-assigned. A verified license backs its specialty (#387, ADR 0038): the
 * catalog row of the registry's specialty for its profession, or of the profession itself.
 */
#[Fillable(['user_id', 'number', 'province', 'profession'])]
class ProfessionalLicense extends Model
{
    /** @use HasFactory<ProfessionalLicenseFactory> */
    use HasFactory;

    /**
     * How old a registry answer gets before the daily reverification asks again: a license can be suspended or
     * withdrawn at any time.
     */
    public const int REVERIFY_AFTER_DAYS = 7;

    /**
     * What a license goes back to when the registry's answer no longer applies to it, as when its DNI changes.
     *
     * @var array<string, mixed>
     */
    public const array UNVERIFIED = [
        'status' => ProfessionalLicenseStatus::Unverified,
        'mismatch_reason' => null,
        'refeps_code' => null,
        'issuer' => null,
        'specialty_id' => null,
        'situation' => null,
        'checked_at' => null,
        'attempted_at' => null,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'province' => Province::class,
            'profession' => HealthProfession::class,
            'status' => ProfessionalLicenseStatus::class,
            'mismatch_reason' => ProfessionalLicenseMismatch::class,
            'checked_at' => 'immutable_datetime',
            'attempted_at' => 'immutable_datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Specialty, $this>
     */
    public function specialty(): BelongsTo
    {
        return $this->belongsTo(Specialty::class);
    }

    /**
     * Never answered by the registry, or answered longer ago than `REVERIFY_AFTER_DAYS`.
     *
     * @param  Builder<self>  $query
     */
    public function scopeDueForReverification(Builder $query): void
    {
        $query->where(fn (Builder $query) => $query
            ->whereNull('checked_at')
            ->orWhere('checked_at', '<=', now()->subDays(self::REVERIFY_AFTER_DAYS)));
    }

    /**
     * How a license number is kept: uppercase, trimmed, with each run of spaces as one.
     */
    public static function normalizedNumber(string $number): string
    {
        return mb_strtoupper(trim((string) preg_replace('/\s+/u', ' ', $number)));
    }
}
