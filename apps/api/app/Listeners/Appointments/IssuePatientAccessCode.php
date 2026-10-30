<?php

declare(strict_types=1);

namespace App\Listeners\Appointments;

use App\Actions\ClinicalAccess\IssuePatientAccessCodeAction;
use App\Actions\ClinicalAccess\RecordClinicalAccessAction;
use App\Data\ClinicalAccess\AccessCodeIssuanceData;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Enums\ClinicalAccessAction;
use App\Events\Appointments\AppointmentBooked;
use App\Jobs\ClinicalAccess\SendPatientAccessCodeJob;
use App\Support\ClinicalAccess;

/**
 * Issues the appointment's access code when the patient has a history another professional of the practice wrote, the
 * only one the code opens (#364, ADR 0029), and mails it to the addresses that get the reminder. The mail waits for the
 * outermost commit (see AppointmentBooked); a patient without one sees the code on the appointment's page, or asks the
 * practice to resend it.
 */
final readonly class IssuePatientAccessCode
{
    public function __construct(
        private IssuePatientAccessCodeAction $issue,
        private RecordClinicalAccessAction $record,
    ) {}

    public function handle(AppointmentBooked $event): void
    {
        $appointment = $event->appointment;

        if (! ClinicalAccess::hasRecordsByOthers($appointment->organization_id, $appointment->membership_id, $appointment->patient_id)) {
            return;
        }

        $accessCode = $this->issue->handle(new AccessCodeIssuanceData($appointment->id));

        if ($appointment->patient?->contacts()->forReminders()->exists() !== true) {
            return;
        }

        $this->record->handle(new ClinicalAccessEntryData(
            organizationId: $appointment->organization_id,
            membershipId: $appointment->membership_id,
            patientId: $appointment->patient_id,
            action: ClinicalAccessAction::AccessCodeSent,
            appointmentId: $appointment->id,
        ));

        SendPatientAccessCodeJob::dispatch($accessCode)->afterCommit();
    }
}
