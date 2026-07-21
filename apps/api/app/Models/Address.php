<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['addressable_type', 'addressable_id', 'street', 'city', 'state', 'postal_code', 'country'])]
class Address extends Model
{
    use SoftDeletes;

    public function addressable(): MorphTo
    {
        return $this->morphTo();
    }
}
