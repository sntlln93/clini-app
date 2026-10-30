<?php

declare(strict_types=1);

namespace App\Http\Resources\Patients;

use App\Enums\PatientContactType;
use App\Models\PatientContact;
use App\Support\PatientContactValue;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PatientContact
 */
class PatientContactResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var PatientContact $contact */
        $contact = $this->resource;

        /** @var PatientContactType $type */
        $type = $contact->type;

        return [
            'id' => $contact->id,
            'type' => $type,
            'value' => $contact->value,
            'display' => PatientContactValue::display($type, $contact->value),
            'label' => $contact->label,
            'needs_confirmation' => $contact->needs_confirmation,
        ];
    }
}
