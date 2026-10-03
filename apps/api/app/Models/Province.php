<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Province as ProvinceSlug;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Reference data: the 24 rows are inserted by their own migration from
 * App\Enums\Province (production never seeds), so there is no factory and
 * nothing in the app writes this table. `slug` casts to that enum, the
 * value the holiday provider needs.
 */
#[WithoutTimestamps]
class Province extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'slug' => ProvinceSlug::class,
        ];
    }

    /**
     * @return HasMany<City, $this>
     */
    public function cities(): HasMany
    {
        return $this->hasMany(City::class);
    }

    /**
     * @return HasMany<Holiday, $this>
     */
    public function holidays(): HasMany
    {
        return $this->hasMany(Holiday::class);
    }
}
