<?php

declare(strict_types=1);

namespace App\Rules;

use App\Enums\PatientContactType;
use App\Support\PatientContactValue as Normalizer;
use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

/**
 * A contact's `value` must be a valid one of the `type` next to it (#365); the type is checked by its own rule.
 */
final class PatientContactValue implements DataAwareRule, ValidationRule
{
    /**
     * @var array<string, mixed>
     */
    private array $data = [];

    /**
     * @param  array<string, mixed>  $data
     */
    public function setData(array $data): static
    {
        $this->data = $data;

        return $this;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $type = Arr::get($this->data, Str::beforeLast($attribute, '.').'.type');
        $type = is_string($type) ? PatientContactType::tryFrom($type) : null;

        if ($type === null || ! is_string($value)) {
            return;
        }

        if (Normalizer::normalize($type, $value) === null) {
            $fail($type === PatientContactType::Email
                ? 'El correo no es válido.'
                : 'El número no es válido. Escribilo con el código de área, o con + y el código de país si no es de Argentina.');
        }
    }
}
