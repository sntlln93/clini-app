<?php

declare(strict_types=1);

namespace App\Http\Requests\Memberships;

use App\Data\Memberships\InvitationIdentityData;
use App\Models\MembershipInvitation;
use App\Models\User;
use App\Support\PasswordPolicy;
use App\Support\PendingInvitationIdentity;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * Public endpoint: failure messages stay generic so a caller can never infer whether the underlying email is registered.
 *
 * A professional invitation (#417) is accepted after its DNI was looked up: the name is the registry's, never typed.
 * A new account chooses its password; an existing one sends its own, and its second factor if it has one (checked by
 * the Action, which also refuses an acceptance with no DNI looked up).
 */
class AcceptInvitationRequest extends FormRequest
{
    private ?MembershipInvitation $invitation = null;

    private bool $invitationResolved = false;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $invitation = $this->invitation();

        if ($invitation !== null && $invitation->isForProfessional()) {
            return $this->professionalRules($this->identity());
        }

        $requiresRegistration = $invitation !== null && ! User::where('email', $invitation->email)->exists();

        return [
            'name' => [$requiresRegistration ? 'required' : 'prohibited', 'string', 'max:255'],
            'password' => [$requiresRegistration ? 'required' : 'prohibited', 'string', Password::defaults(), 'confirmed'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function professionalRules(?InvitationIdentityData $identity): array
    {
        if ($identity === null) {
            // The Action answers `memberships.invitation_document_required`.
            return ['name' => ['prohibited']];
        }

        if ($identity->userId !== null) {
            return [
                'name' => ['prohibited'],
                'password' => ['required', 'string', 'max:255'],
                'code' => ['nullable', 'prohibits:recovery_code', 'string', 'regex:/^\s*\d{3}\s?\d{3}\s*$/'],
                'recovery_code' => ['nullable', 'string', 'max:32'],
            ];
        }

        return [
            'name' => ['prohibited'],
            'password' => ['required', 'string', Password::defaults(), 'confirmed'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...PasswordPolicy::messages(),
            'name.prohibited' => 'El nombre sale del Buscador Nacional de Profesionales de la Salud.',
            'code.regex' => 'El código tiene 6 números.',
            'code.prohibits' => 'Enviá el código de la app o uno de recuperación, no los dos.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->invitation() === null) {
                $validator->errors()->add('token', 'La invitación no es válida o ya expiró.');
            }
        });
    }

    /**
     * The identity a professional invitation's DNI found in this session, if any (#417).
     */
    public function identity(): ?InvitationIdentityData
    {
        $invitation = $this->invitation();

        return $invitation === null ? null : PendingInvitationIdentity::for($this, $invitation);
    }

    public function code(): ?string
    {
        $code = $this->input('code');

        return is_string($code) && trim($code) !== '' ? (string) preg_replace('/\s+/', '', $code) : null;
    }

    public function recoveryCode(): ?string
    {
        $code = $this->input('recovery_code');

        return is_string($code) && trim($code) !== '' ? trim($code) : null;
    }

    private function invitation(): ?MembershipInvitation
    {
        if ($this->invitationResolved) {
            return $this->invitation;
        }

        $this->invitationResolved = true;

        $token = (string) $this->route('token');

        $invitation = MembershipInvitation::query()
            ->where('token', hash('sha256', $token))
            ->whereNull('accepted_at')
            ->first();

        // A suspended organization's invitations are rejected with the same
        // generic message (AcceptInvitationAction re-checks it under lock).
        if ($invitation !== null && ($invitation->isExpired() || $invitation->organization?->suspended_at !== null)) {
            $invitation = null;
        }

        return $this->invitation = $invitation;
    }
}
