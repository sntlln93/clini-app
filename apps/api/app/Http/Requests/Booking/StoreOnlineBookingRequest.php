<?php

declare(strict_types=1);

namespace App\Http\Requests\Booking;

use App\Enums\DocumentType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOnlineBookingRequest extends FormRequest
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
            'membership_id' => ['required', 'integer', 'exists:memberships,id'],
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'start_at' => ['required', 'date', 'after:now'],
            'patient.name' => ['required', 'string', 'max:255'],
            'patient.document_type' => ['required', Rule::enum(DocumentType::class)],
            'patient.document_number' => ['required', 'string', 'max:50'],
            'patient.email' => ['nullable', 'email', 'max:255'],
            'patient.phone' => ['nullable', 'string', 'max:50'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'membership_id.exists' => 'El profesional elegido no existe.',
            'service_id.exists' => 'La prestación elegida no existe.',
            'start_at.after' => 'No se pueden reservar turnos en el pasado.',
            'patient.name.required' => 'El nombre es obligatorio.',
            'patient.document_type.required' => 'Elegí un tipo de documento.',
            'patient.document_number.required' => 'El número de documento es obligatorio.',
            'patient.email.email' => 'El correo no es válido.',
        ];
    }
}
