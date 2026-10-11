<?php

declare(strict_types=1);

namespace App\Http\Requests\Reports;

use App\Enums\MembershipRole;
use App\Enums\ReportGranularity;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Defaults are filled before validation (their single source): a missing
 * `to` is today in the organization's timezone, a missing `from` is the
 * first day of the month two months before `to` (three calendar months),
 * and the granularity is the month.
 */
class ShowReportRequest extends FormRequest
{
    public const int MAX_SPAN_DAYS = 366;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('granularity')) {
            $this->merge(['granularity' => ReportGranularity::Month->value]);
        }

        if (! $this->filled('to')) {
            $this->merge(['to' => CarbonImmutable::now($this->timezone())->toDateString()]);
        }

        if (! $this->filled('from')) {
            $to = $this->localDate($this->input('to'));

            if ($to !== null) {
                $this->merge(['from' => $to->startOfMonth()->subMonthsNoOverflow(2)->toDateString()]);
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
            'granularity' => ['required', Rule::enum(ReportGranularity::class)],
            'membership_id' => ['nullable', 'integer', Rule::exists('memberships', 'id')->where(fn ($query) => $query
                ->where('organization_id', app(CurrentOrganization::class)->get())
                ->whereNull('deleted_at')
                ->whereJsonContains('roles', MembershipRole::Professional->value))],
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

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'to.after_or_equal' => 'La fecha de fin debe ser posterior o igual a la de inicio.',
            'membership_id.exists' => 'El profesional elegido no existe.',
        ];
    }

    public function professional(): ?Membership
    {
        return $this->filled('membership_id') ? Membership::query()->findOrFail($this->integer('membership_id')) : null;
    }

    public function timezone(): string
    {
        $organizationId = app(CurrentOrganization::class)->get();
        $timezone = $organizationId === null ? null : Organization::query()->whereKey($organizationId)->value('timezone');

        return is_string($timezone) ? $timezone : config()->string('app.timezone');
    }

    private function localDate(mixed $value): ?CarbonImmutable
    {
        if (! is_string($value) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return null;
        }

        $date = CarbonImmutable::createFromFormat('!Y-m-d', $value, $this->timezone());

        return $date instanceof CarbonImmutable && $date->toDateString() === $value ? $date : null;
    }
}
