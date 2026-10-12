<?php

declare(strict_types=1);

namespace App\Http\Requests\Organizations;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAcceptedInsuranceProvidersRequest extends FormRequest
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
            'insurance_provider_ids' => ['present', 'array'],
            'insurance_provider_ids.*' => ['integer', 'distinct', 'exists:insurance_providers,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'insurance_provider_ids.*.exists' => 'Una de las obras sociales elegidas no existe.',
        ];
    }

    /**
     * @return list<int>
     */
    public function insuranceProviderIds(): array
    {
        /** @var array<int, int|string> $ids */
        $ids = $this->array('insurance_provider_ids');

        return array_values(array_map(intval(...), $ids));
    }
}
