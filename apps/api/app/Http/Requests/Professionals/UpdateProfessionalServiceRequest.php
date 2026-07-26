<?php

declare(strict_types=1);

namespace App\Http\Requests\Professionals;

use App\Models\Membership;
use App\Rules\BelongsToCurrentOrganization;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProfessionalServiceRequest extends FormRequest
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
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'duration_minutes' => ['required', 'integer', 'min:1'],
            'price_cents' => ['nullable', 'integer', 'min:0'],
            'active' => ['sometimes', 'boolean'],
        ];
    }
}
