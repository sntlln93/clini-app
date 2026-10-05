<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class IndexUserRequest extends FormRequest
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
            'q' => ['nullable', 'string', 'max:100'],
            'verified' => ['nullable', 'in:true,false'],
            'blocked' => ['nullable', 'in:true,false'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
