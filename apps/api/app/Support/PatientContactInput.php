<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Patients\PatientContactData;
use App\Enums\PatientContactType;
use App\Rules\PatientContactValue as ValidPatientContactValue;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * The `contacts` list the patient form and the online booking send (#365), validated the same way in both.
 */
final class PatientContactInput
{
    public const int MAX_CONTACTS = 10;

    /**
     * @return array<string, mixed>
     */
    public static function rules(string $key, int $max = self::MAX_CONTACTS): array
    {
        return [
            $key => ['nullable', 'list', 'max:'.$max],
            $key.'.*' => ['array:type,value,label'],
            $key.'.*.type' => ['required', Rule::enum(PatientContactType::class)],
            $key.'.*.value' => ['required', 'string', 'max:255', new ValidPatientContactValue],
            $key.'.*.label' => ['nullable', 'string', 'max:50'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function messages(string $key): array
    {
        return [
            $key.'.max' => 'Se pueden cargar hasta :max contactos.',
            $key.'.*.type.required' => 'Elegí el tipo de contacto.',
            $key.'.*.value.required' => 'Completá el contacto o quitalo.',
            $key.'.*.label.max' => 'La etiqueta puede tener hasta :max caracteres.',
        ];
    }

    /**
     * The same contact twice, however it was typed, is one error on the repeated row.
     *
     * @return list<callable(Validator): void>
     */
    public static function after(Request $request, string $key): array
    {
        return [function (Validator $validator) use ($request, $key): void {
            $seen = [];

            foreach (self::validEntries($request, $key) as $index => [$type, $value]) {
                $normalized = $type->value.'|'.PatientContactValue::normalize($type, $value);

                if (isset($seen[$normalized])) {
                    $validator->errors()->add("{$key}.{$index}.value", 'Este contacto ya está en la lista.');
                }

                $seen[$normalized] = true;
            }
        }];
    }

    /**
     * Call only after validation passed.
     *
     * @return list<PatientContactData>
     */
    public static function data(Request $request, string $key): array
    {
        $contacts = [];
        $labels = (array) $request->input($key, []);

        foreach (self::validEntries($request, $key) as $index => [$type, $value]) {
            $label = is_array($labels[$index] ?? null) ? ($labels[$index]['label'] ?? null) : null;
            $label = is_string($label) ? trim($label) : '';

            $contacts[] = new PatientContactData(
                type: $type,
                value: (string) PatientContactValue::normalize($type, $value),
                label: $label === '' ? null : $label,
            );
        }

        return $contacts;
    }

    /**
     * @return array<int, array{PatientContactType, string}>
     */
    private static function validEntries(Request $request, string $key): array
    {
        $entries = [];

        foreach ((array) $request->input($key, []) as $index => $contact) {
            $type = is_array($contact) && is_string($contact['type'] ?? null) ? PatientContactType::tryFrom($contact['type']) : null;
            $value = is_array($contact) ? ($contact['value'] ?? null) : null;

            if ($type !== null && is_string($value) && PatientContactValue::normalize($type, $value) !== null) {
                $entries[(int) $index] = [$type, $value];
            }
        }

        return $entries;
    }
}
