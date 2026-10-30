<?php

declare(strict_types=1);

namespace App\Jobs\ClinicalAccess;

use App\Mail\ClinicalAccess\PatientAccessCodeMail;
use App\Models\PatientAccessCode;
use App\Models\PatientContact;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Mails an access code to the patient (#364, ADR 0029): to one address when the practice resends it, otherwise to every
 * address that gets the reminder, one mail each so no contact sees another's (#365). Carries the code's id only, never
 * the code; a code that stopped opening anything since is not sent.
 */
final class SendPatientAccessCodeJob implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    public bool $deleteWhenMissingModels = true;

    public function __construct(
        public readonly PatientAccessCode $accessCode,
        public readonly ?int $contactId = null,
    ) {}

    public function handle(): void
    {
        $accessCode = PatientAccessCode::query()
            ->withoutGlobalScope('organization')
            ->valid()
            ->with(['appointment' => fn ($query) => $query->withoutGlobalScope('organization')])
            ->find($this->accessCode->id);

        if ($accessCode === null || $accessCode->appointment === null) {
            return;
        }

        $emails = PatientContact::query()
            ->where('patient_id', $accessCode->patient_id)
            ->forReminders()
            ->when($this->contactId !== null, fn ($query) => $query->whereKey($this->contactId))
            ->pluck('value');

        foreach ($emails as $email) {
            Mail::to($email)->send(new PatientAccessCodeMail($accessCode->appointment, $accessCode->formatted()));
        }
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('Failed to send a patient access code', [
            'patient_access_code_id' => $this->accessCode->id,
            // The class only: a transport's message can echo the patient's address (#322).
            'exception' => $exception !== null ? $exception::class : null,
        ]);
    }
}
