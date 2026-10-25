<?php

declare(strict_types=1);

namespace App\Http\Requests\Prescriptions;

use App\Enums\PrescriptionAnnulmentKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Annulling says whether the medication is no longer needed or never was,
 * and takes a reason with the same limits as annulling a note: it can't be
 * undone, so the reason is what explains it in the history (#344).
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
            'kind' => ['required', Rule::enum(PrescriptionAnnulmentKind::class)],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }

    public function kind(): PrescriptionAnnulmentKind
    {
        /** @var PrescriptionAnnulmentKind $kind */
        $kind = $this->enum('kind', PrescriptionAnnulmentKind::class);

        return $kind;
    }
}
