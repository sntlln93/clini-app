<?php

declare(strict_types=1);

namespace App\Http\Requests\VitalSigns;

use App\Data\VitalSigns\VitalSignValuesData;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Every value is optional, but a measurement holds at least one, each within a plausible range (#361): a value out of
 * it is a typo, not a reading.
 */
class StoreVitalSignRequest extends FormRequest
{
    /**
     * Each value's rules beyond `nullable` and its type.
     */
    public const array RANGES = [
        'weight_kg' => ['numeric', 'decimal:0,2', 'min:0.2', 'max:500'],
        'height_cm' => ['numeric', 'decimal:0,1', 'min:20', 'max:250'],
        'head_circumference_cm' => ['numeric', 'decimal:0,1', 'min:20', 'max:80'],
        'waist_circumference_cm' => ['numeric', 'decimal:0,1', 'min:20', 'max:250'],
        'systolic_mmhg' => ['integer', 'min:40', 'max:300'],
        'diastolic_mmhg' => ['integer', 'min:20', 'max:200'],
        'capillary_glucose_mg_dl' => ['integer', 'min:10', 'max:1000'],
        'heart_rate_bpm' => ['integer', 'min:20', 'max:300'],
        'respiratory_rate_rpm' => ['integer', 'min:4', 'max:100'],
        'temperature_c' => ['numeric', 'decimal:0,1', 'min:30', 'max:45'],
        'oxygen_saturation_pct' => ['integer', 'min:50', 'max:100'],
    ];

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rules = array_map(fn (array $range): array => ['nullable', ...$range], self::RANGES);

        // A blood pressure is both numbers, the diastolic below the systolic.
        $rules['systolic_mmhg'][] = 'required_with:diastolic_mmhg';
        $rules['diastolic_mmhg'][] = 'required_with:systolic_mmhg';
        $rules['diastolic_mmhg'][] = 'lt:systolic_mmhg';

        return $rules;
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $filled = array_filter(array_keys(self::RANGES), fn (string $key): bool => $this->filled($key));

                if ($filled === []) {
                    $validator->errors()->add('values', 'Cargá al menos un dato de la medición.');
                }
            },
        ];
    }

    public function values(): VitalSignValuesData
    {
        return new VitalSignValuesData(
            weightKg: $this->decimal('weight_kg'),
            heightCm: $this->decimal('height_cm'),
            headCircumferenceCm: $this->decimal('head_circumference_cm'),
            waistCircumferenceCm: $this->decimal('waist_circumference_cm'),
            systolicMmhg: $this->wholeNumber('systolic_mmhg'),
            diastolicMmhg: $this->wholeNumber('diastolic_mmhg'),
            capillaryGlucoseMgDl: $this->wholeNumber('capillary_glucose_mg_dl'),
            heartRateBpm: $this->wholeNumber('heart_rate_bpm'),
            respiratoryRateRpm: $this->wholeNumber('respiratory_rate_rpm'),
            temperatureC: $this->decimal('temperature_c'),
            oxygenSaturationPct: $this->wholeNumber('oxygen_saturation_pct'),
        );
    }

    private function decimal(string $key): ?float
    {
        return $this->filled($key) ? $this->float($key) : null;
    }

    private function wholeNumber(string $key): ?int
    {
        return $this->filled($key) ? $this->integer($key) : null;
    }
}
