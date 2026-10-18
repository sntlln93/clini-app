<?php

declare(strict_types=1);

namespace App\Http\Requests\ClinicalNotes;

use Illuminate\Foundation\Http\FormRequest;

class AmendClinicalNoteRequest extends FormRequest
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
            'body' => ['required', 'string', 'max:5000'],
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function reason(): ?string
    {
        $reason = $this->string('reason')->trim()->toString();

        return $reason === '' ? null : $reason;
    }
}
