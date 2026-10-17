<?php

declare(strict_types=1);

namespace App\Http\Requests\Contact;

use App\Enums\Plan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The landing's contact form (#248). `website` is a honeypot: the form hides
 * it from people, so only a bot fills it (see isHoneypotFilled()).
 */
class StoreContactRequestRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:120'],
            // strict: the plain RFC check lets through addresses (with comments) that
            // the mailer rejects, which would fail the queued team mail's Reply-To.
            'email' => ['required', 'email:strict', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'organization_name' => ['nullable', 'string', 'max:120'],
            'team_size' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'plan' => ['nullable', Rule::enum(Plan::class)],
            'message' => ['required', 'string', 'max:2000'],
            'website' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Ingresá tu nombre.',
            'name.max' => 'El nombre puede tener hasta 120 caracteres.',
            'email.required' => 'Ingresá tu correo.',
            'email.email' => 'Ingresá un correo válido.',
            'email.max' => 'El correo puede tener hasta 255 caracteres.',
            'phone.max' => 'El teléfono puede tener hasta 40 caracteres.',
            'organization_name.max' => 'El nombre puede tener hasta 120 caracteres.',
            'team_size.integer' => 'Ingresá un número entero.',
            'team_size.min' => 'Ingresá al menos 1 profesional.',
            'team_size.max' => 'Ingresá hasta 1000 profesionales.',
            'plan.enum' => 'Elegí un plan de la lista.',
            'message.required' => 'Contanos en qué te podemos ayudar.',
            'message.max' => 'El mensaje puede tener hasta 2000 caracteres.',
        ];
    }

    public function isHoneypotFilled(): bool
    {
        return $this->filled('website');
    }
}
