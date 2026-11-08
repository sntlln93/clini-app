<?php

declare(strict_types=1);

namespace App\Http\Requests\Professionals;

use App\Models\Membership;
use App\Models\Specialty;
use App\Rules\BelongsToCurrentOrganization;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

class StoreProfessionalSpecialtyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $membership = $this->route('membership');

        $this->merge([
            'membership_id' => $membership instanceof Membership ? $membership->id : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'membership_id' => ['required', new BelongsToCurrentOrganization(Membership::class)],
            'specialty_id' => [
                'required',
                'integer',
                'exists:specialties,id',
                function (string $attribute, mixed $value, Closure $fail): void {
                    $membership = $this->route('membership');

                    if (! $membership instanceof Membership) {
                        return;
                    }

                    // Only what a verified license of theirs backs (#387); one that loses it later stays, marked.
                    $isBacked = Specialty::query()->backedFor($membership->user_id)->whereKey($value)->exists();

                    if (! $isBacked) {
                        $fail('Ninguna matrícula verificada del profesional respalda esta especialidad.');
                    }
                },
            ],
        ];
    }
}
