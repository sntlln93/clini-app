<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name'])]
class InsuranceProvider extends Model
{
    public function patients(): HasMany
    {
        return $this->hasMany(Patient::class);
    }
}
