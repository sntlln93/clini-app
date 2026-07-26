<?php

declare(strict_types=1);

namespace App\Http\Requests\Professionals;

use App\Models\Membership;
use App\Models\UserSpecialty;
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

                    $isInCredential = UserSpecialty::query()
                        ->where('user_id', $membership->user_id)
                        ->where('specialty_id', $value)
                        ->exists();

                    if (! $isInCredential) {
                        $fail('El profesional no cuenta con esta especialidad como credencial.');
                    }
                },
            ],
        ];
    }
}
