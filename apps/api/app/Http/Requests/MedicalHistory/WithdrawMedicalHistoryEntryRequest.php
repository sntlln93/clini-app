<?php

declare(strict_types=1);

namespace App\Http\Requests\MedicalHistory;

use Illuminate\Foundation\Http\FormRequest;

/**
 * An entry that no longer applies is not a mistake, so the reason is optional (#361).
 */
class WithdrawMedicalHistoryEntryRequest extends FormRequest
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
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function reason(): ?string
    {
        $reason = $this->string('reason')->trim()->toString();

        return $reason === '' ? null : $reason;
    }
}
