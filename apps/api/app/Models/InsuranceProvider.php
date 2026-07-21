<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\InsuranceProviderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name'])]
class InsuranceProvider extends Model
{
    /** @use HasFactory<InsuranceProviderFactory> */
    use HasFactory;

    public function patients(): HasMany
    {
        return $this->hasMany(Patient::class);
    }
}
