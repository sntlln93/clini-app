<?php

declare(strict_types=1);

namespace App\Http\Requests\Memberships;

use Illuminate\Foundation\Http\FormRequest;

class IndexMembershipRequest extends FormRequest
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
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
