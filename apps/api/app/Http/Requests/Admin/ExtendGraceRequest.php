<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

class ExtendGraceRequest extends FormRequest
{
    public const int MAX_DAYS_AHEAD = 90;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * "Today" is the reporting timezone's — the same day the dashboard's date
     * input uses; with UTC, late-evening Argentina would reject "tomorrow".
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $today = CarbonImmutable::now(config()->string('admin.reporting_timezone'));

        return [
            'grace_ends_on' => [
                'required',
                'date_format:Y-m-d',
                'after:'.$today->toDateString(),
                'before_or_equal:'.$today->addDays(self::MAX_DAYS_AHEAD)->toDateString(),
            ],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }
}
