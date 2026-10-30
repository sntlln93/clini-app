<?php

declare(strict_types=1);

namespace App\Http\Requests\MedicalHistory;

use App\Enums\BloodType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The first blood type or a change of it, with an optional reason (#361).
 */
class StoreBloodTypeRequest extends FormRequest
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
            'blood_type' => ['required', Rule::enum(BloodType::class)],
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function bloodType(): BloodType
    {
        /** @var BloodType $bloodType */
        $bloodType = $this->enum('blood_type', BloodType::class);

        return $bloodType;
    }

    public function reason(): ?string
    {
        $reason = $this->string('reason')->trim()->toString();

        return $reason === '' ? null : $reason;
    }
}
