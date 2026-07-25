<?php

declare(strict_types=1);

namespace App\Rules;

use App\Support\CurrentOrganization;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Model;

/**
 * CU-33: rejects a reference to an entity that doesn't exist, belongs to
 * another organization, or is checked with no organization active.
 *
 * Filters organization_id explicitly against CurrentOrganization instead
 * of depending on the model's implicit BelongsToOrganization global
 * scope — it bypasses that scope by name and re-applies the filter
 * itself, so the rule works the same whether or not the scope happens to
 * be registered on $modelClass.
 *
 * Reused for any foreign-key-shaped field that must resolve within the
 * active organization, with optional extra conditions, e.g.:
 *
 *   new BelongsToCurrentOrganization(Membership::class, ['status' => MembershipStatus::Active])
 *   new BelongsToCurrentOrganization(Service::class)
 */
final readonly class BelongsToCurrentOrganization implements ValidationRule
{
    /**
     * @param  class-string<Model>  $modelClass
     * @param  array<string, mixed>  $conditions
     */
    public function __construct(
        private string $modelClass,
        private array $conditions = [],
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $organizationId = app(CurrentOrganization::class)->get();

        if ($organizationId === null) {
            $fail('No hay una organización activa.');

            return;
        }

        $modelClass = $this->modelClass;

        $exists = $modelClass::query()
            ->withoutGlobalScope('organization')
            ->where('organization_id', $organizationId)
            ->where($this->conditions)
            ->whereKey($value)
            ->exists();

        if (! $exists) {
            $fail('El valor seleccionado no pertenece a la organización activa.');
        }
    }
}
