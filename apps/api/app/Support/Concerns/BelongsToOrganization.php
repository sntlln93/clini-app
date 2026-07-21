<?php

declare(strict_types=1);

namespace App\Support\Concerns;

use App\Models\Organization;
use App\Support\CurrentOrganization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Applies organization_id tenant scoping to a model.
 *
 * No-ops when no current organization is set (App\Support\CurrentOrganization),
 * so migrate:fresh, factories and context-less tests are unaffected.
 */
trait BelongsToOrganization
{
    public static function bootBelongsToOrganization(): void
    {
        static::addGlobalScope('organization', function (Builder $builder): void {
            $current = app(CurrentOrganization::class);

            if ($current->has()) {
                $builder->where('organization_id', $current->get());
            }
        });

        static::creating(function ($model): void {
            $current = app(CurrentOrganization::class);

            if (empty($model->organization_id) && $current->has()) {
                $model->organization_id = $current->get();
            }
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
