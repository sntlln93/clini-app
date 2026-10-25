<?php

declare(strict_types=1);

namespace App\Http\Requests\Prescriptions;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Annulling takes a reason with the same limits as annulling a note: it can't
 * be undone, so the reason is what explains it in the history (#344).
 */
class AnnulPrescriptionRequest extends FormRequest
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
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }
}
