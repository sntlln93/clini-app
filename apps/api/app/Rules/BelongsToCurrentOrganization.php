<?php

declare(strict_types=1);

namespace App\Rules;

use App\Support\CurrentOrganization;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Model;

/**
 * Filters organization_id itself instead of relying on the global scope, so it works whether or not $modelClass registers it.
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
