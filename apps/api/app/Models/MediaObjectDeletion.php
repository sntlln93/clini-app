<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * An object of an uploaded-file disk waiting for its deferred deletion (#410). Written only through
 * `App\Support\MediaObjectDeletions`, deleted by `App\Actions\Media\DeleteDueMediaObjectAction`.
 */
#[Fillable(['disk', 'path', 'deletes_at'])]
class MediaObjectDeletion extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'deletes_at' => 'immutable_datetime',
        ];
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeDue(Builder $query): void
    {
        $query->where('deletes_at', '<=', now());
    }
}
