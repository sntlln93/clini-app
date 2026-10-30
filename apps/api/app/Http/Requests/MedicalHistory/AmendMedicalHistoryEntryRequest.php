<?php

declare(strict_types=1);

namespace App\Http\Requests\MedicalHistory;

use App\Data\MedicalHistory\MedicalHistoryContentData;
use App\Enums\AllergySeverity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The whole new text of an entry, plus an optional reason. It never reads the entry, which would happen before
 * authorization: the action drops what the entry's category doesn't carry.
 */
class AmendMedicalHistoryEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...self::contentRules(),
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, list<mixed>>
     */
    public static function contentRules(): array
    {
        return [
            'description' => ['required', 'string', 'max:500'],
            'reaction' => ['nullable', 'string', 'max:255'],
            'severity' => ['nullable', Rule::enum(AllergySeverity::class)],
            'approximate_date' => ['nullable', 'string', 'max:50'],
        ];
    }

    public function content(): MedicalHistoryContentData
    {
        return new MedicalHistoryContentData(
            description: $this->string('description')->trim()->toString(),
            reaction: $this->optionalText('reaction'),
            severity: $this->enum('severity', AllergySeverity::class),
            approximateDate: $this->optionalText('approximate_date'),
        );
    }

    public function reason(): ?string
    {
        return $this->optionalText('reason');
    }

    protected function optionalText(string $key): ?string
    {
        $value = $this->string($key)->trim()->toString();

        return $value === '' ? null : $value;
    }
}
