<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Defaults are filled before validation (their single source): a missing
 * `to` is today in the reporting timezone, a missing `from` is `to − 29
 * days`. So `from <= to` and the span limit always hold for the resolved
 * range.
 */
class StatsRequest extends FormRequest
{
    public const int MAX_SPAN_DAYS = 366;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $timezone = config()->string('admin.reporting_timezone');

        if (! $this->filled('to')) {
            $this->merge(['to' => CarbonImmutable::now($timezone)->toDateString()]);
        }

        if (! $this->filled('from')) {
            $to = $this->localDate($this->input('to'));

            if ($to !== null) {
                $this->merge(['from' => $to->subDays(29)->toDateString()]);
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'organization_id' => ['nullable', 'integer', 'exists:organizations,id'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $from = $this->localDate($this->input('from'));
                $to = $this->localDate($this->input('to'));

                if ($from !== null && $to !== null && $from->diffInDays($to) + 1 > self::MAX_SPAN_DAYS) {
                    $validator->errors()->add('to', 'El rango no puede superar los 366 días.');
                }
            },
        ];
    }

    private function localDate(mixed $value): ?CarbonImmutable
    {
        if (! is_string($value) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return null;
        }

        $date = CarbonImmutable::createFromFormat('!Y-m-d', $value, config()->string('admin.reporting_timezone'));

        return $date instanceof CarbonImmutable && $date->toDateString() === $value ? $date : null;
    }
}
