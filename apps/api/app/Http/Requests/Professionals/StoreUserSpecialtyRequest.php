<?php

declare(strict_types=1);

namespace App\Http\Requests\Professionals;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserSpecialtyRequest extends FormRequest
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
            'specialty_id' => ['required', 'integer', 'exists:specialties,id'],
        ];
    }
}
