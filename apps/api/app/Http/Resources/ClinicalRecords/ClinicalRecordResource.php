<?php

declare(strict_types=1);

namespace App\Http\Resources\ClinicalRecords;

use App\Http\Resources\ClinicalAccess\ClinicalAccessTrailEntryResource;
use App\Http\Resources\MedicalHistory\MedicalHistoryEntryResource;
use App\Http\Resources\VitalSigns\VitalSignResource;
use App\Models\Appointment;
use App\Models\BloodTypeRecord;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteDiagnosis;
use App\Models\ClinicalNoteVersion;
use App\Models\MedicalHistoryEntry;
use App\Models\MedicalHistoryEntryVersion;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionVersion;
use App\Models\VitalSign;
use App\Models\VitalSignVersion;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One patient's clinical history within the organization (#326, ADR 0021), as `ClinicalRecordLoader` loads it: the
 * appointments in order, each with every author's notes, indicated medication (#359) and measurements (#361), and every
 * version of each with
 * its author, time and reason, so the export shows who did what and when; the patient's background (blood type,
 * allergies, antecedents); then the patient's access trail, oldest
 * first, which also says who read it and exported it (#325, ADR 0022). The patient's identity goes without contact
 * data, which isn't part of the history. The PDF renders this same shape.
 *
 * @mixin Patient
 */
class ClinicalRecordResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $patient = $this->patient();
        $notes = $patient->clinicalNotes->groupBy('appointment_id');
        $prescriptions = $patient->prescriptions->groupBy('appointment_id');
        $vitalSigns = $patient->vitalSigns->groupBy('appointment_id');

        return [
            'patient' => [
                'id' => $patient->id,
                'name' => $patient->name,
                'document_type' => $patient->document_type,
                'document_number' => $patient->document_number,
                'sex' => $patient->sex,
                'birth_date' => $patient->birth_date?->format('Y-m-d'),
                'insurance_provider' => $patient->insuranceProvider?->name,
                'insurance_member_number' => $patient->insurance_member_number,
            ],
            'appointments' => $patient->appointments->map(fn (Appointment $appointment): array => [
                'id' => $appointment->id,
                'start_at' => $appointment->start_at,
                'end_at' => $appointment->end_at,
                'status' => $appointment->status,
                'professional' => $this->person($appointment->membership),
                'service' => $appointment->service?->name,
                'reason' => $appointment->reason,
                'cancelled_at' => $appointment->cancelled_at,
                'cancellation_reason' => $appointment->cancellation_reason,
                'clinical_notes' => $notes->get($appointment->id, new Collection)->map($this->note(...))->values()->all(),
                'prescriptions' => $prescriptions->get($appointment->id, new Collection)->map($this->prescription(...))->values()->all(),
                'vital_signs' => $vitalSigns->get($appointment->id, new Collection)->map($this->vitalSign(...))->values()->all(),
            ])->values()->all(),
            // Of the person rather than of one appointment (#361): each one still says which appointment it was recorded on.
            'blood_types' => $patient->bloodTypeRecords->map(fn (BloodTypeRecord $record): array => [
                'id' => $record->id,
                'appointment_id' => $record->appointment_id,
                'author' => $this->person($record->author),
                'created_at' => $record->created_at,
                'blood_type' => $record->blood_type,
                'reason' => $record->reason,
            ])->values()->all(),
            'medical_history' => $patient->medicalHistoryEntries->map($this->medicalHistoryEntry(...))->values()->all(),
            'access_log' => ClinicalAccessTrailEntryResource::collection($patient->clinicalAccessLogs)->resolve($request),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function note(ClinicalNote $note): array
    {
        $annulment = $note->annulment;

        return [
            'id' => $note->id,
            'author' => $this->person($note->author),
            'created_at' => $note->created_at,
            'annulment' => $annulment === null ? null : [
                'author' => $this->person($annulment->author),
                'reason' => $annulment->reason,
                'created_at' => $annulment->created_at,
            ],
            'versions' => $note->versions->map(fn (ClinicalNoteVersion $version): array => [
                'version' => $version->version,
                'author' => $this->person($version->author),
                'created_at' => $version->created_at,
                'reason' => $version->reason,
                'body' => $version->body,
                // As written in that version, never the catalog's current text (ADR 0020).
                'diagnoses' => $version->diagnoses->map(fn (ClinicalNoteDiagnosis $diagnosis): array => [
                    'code' => $diagnosis->code,
                    'description' => $diagnosis->description,
                ])->values()->all(),
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function prescription(Prescription $prescription): array
    {
        $annulment = $prescription->annulment;

        return [
            'id' => $prescription->id,
            'author' => $this->person($prescription->author),
            'issued_at' => $prescription->issued_at,
            'created_at' => $prescription->created_at,
            'annulment' => $annulment === null ? null : [
                'author' => $this->person($annulment->author),
                'reason' => $annulment->reason,
                'created_at' => $annulment->created_at,
            ],
            'versions' => $prescription->versions->map(fn (PrescriptionVersion $version): array => [
                'version' => $version->version,
                'author' => $this->person($version->author),
                'created_at' => $version->created_at,
                'reason' => $version->reason,
                'items' => $version->items->map(fn (PrescriptionItem $item): array => [
                    'medication' => $item->medication,
                    'presentation' => $item->presentation,
                    'dosage' => $item->dosage,
                    'quantity' => $item->quantity,
                ])->values()->all(),
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function vitalSign(VitalSign $vitalSign): array
    {
        $annulment = $vitalSign->annulment;

        return [
            'id' => $vitalSign->id,
            'author' => $this->person($vitalSign->author),
            'measured_at' => $vitalSign->measured_at,
            'annulment' => $annulment === null ? null : [
                'author' => $this->person($annulment->author),
                'reason' => $annulment->reason,
                'created_at' => $annulment->created_at,
            ],
            'versions' => $vitalSign->versions->map(fn (VitalSignVersion $version): array => [
                'version' => $version->version,
                'author' => $this->person($version->author),
                'created_at' => $version->created_at,
                'reason' => $version->reason,
                'values' => VitalSignResource::values($version),
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function medicalHistoryEntry(MedicalHistoryEntry $entry): array
    {
        $withdrawal = $entry->withdrawal;

        return [
            'id' => $entry->id,
            'appointment_id' => $entry->appointment_id,
            'category' => $entry->category,
            'author' => $this->person($entry->author),
            'created_at' => $entry->created_at,
            'withdrawal' => $withdrawal === null ? null : [
                'author' => $this->person($withdrawal->author),
                'reason' => $withdrawal->reason,
                'created_at' => $withdrawal->created_at,
            ],
            'versions' => $entry->versions->map(fn (MedicalHistoryEntryVersion $version): array => [
                'version' => $version->version,
                'author' => $this->person($version->author),
                'created_at' => $version->created_at,
                'reason' => $version->reason,
                ...MedicalHistoryEntryResource::content($version),
            ])->values()->all(),
        ];
    }

    /**
     * @return array{membership_id: int, name: string|null}|null
     */
    private function person(?Membership $membership): ?array
    {
        return $membership === null ? null : [
            'membership_id' => $membership->id,
            'name' => $membership->user?->name,
        ];
    }

    private function patient(): Patient
    {
        /** @var Patient $patient */
        $patient = $this->resource;

        return $patient;
    }
}
