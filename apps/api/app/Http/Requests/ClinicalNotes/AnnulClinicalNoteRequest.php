<?php

declare(strict_types=1);

namespace App\Http\Requests\ClinicalNotes;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Annulling takes a reason, unlike an amendment: the note stays, so the
 * history has to say why it no longer counts.
 */
class AnnulClinicalNoteRequest extends FormRequest
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
