<?php

declare(strict_types=1);

namespace App\Http\Requests\ClinicalAccess;

use Illuminate\Foundation\Http\FormRequest;

class IndexExceptionalAccessRequest extends FormRequest
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
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
