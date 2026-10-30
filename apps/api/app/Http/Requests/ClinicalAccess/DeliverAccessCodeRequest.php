<?php

declare(strict_types=1);

namespace App\Http\Requests\ClinicalAccess;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Which of the patient's addresses the practice resends the code to (#364). Whether it is one of theirs is decided in
 * the Action, after authorization.
 */
class DeliverAccessCodeRequest extends FormRequest
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
            'contact_id' => ['required', 'integer'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'contact_id.required' => 'Elegí a qué email enviarlo.',
            'contact_id.integer' => 'Elegí a qué email enviarlo.',
        ];
    }
}
