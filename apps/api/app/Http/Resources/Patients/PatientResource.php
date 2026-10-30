<?php

declare(strict_types=1);

namespace App\Http\Resources\Patients;

use App\Data\ClinicalAccess\ClinicalAccessStateData;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * @mixin Patient
 */
class PatientResource extends JsonResource
{
    /**
     * Only a patient's own page asks for it (#325): it lets the panel know ahead whether reading the clinical history
     * will be answered, or will take a reason, instead of finding out through a 403 or a 409.
     */
    private ?ClinicalAccessStateData $clinicalAccess = null;

    public function withClinicalAccess(ClinicalAccessStateData $clinicalAccess): static
    {
        $this->clinicalAccess = $clinicalAccess;

        return $this;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $patient = $this->patient();

        // PHPStan/Larastan can't infer attribute types from Patient::casts() (parseModelCastsMethod is off) — same limitation Membership::permissions() works around.
        /** @var Carbon|null $birthDate */
        $birthDate = $patient->birth_date;

        $data = [
            'id' => $patient->id,
            'name' => $patient->name,
            'contacts' => PatientContactResource::collection($this->whenLoaded('contacts')),
            'document_type' => $patient->document_type,
            'document_number' => $patient->document_number,
            'sex' => $patient->sex,
            'birth_date' => $birthDate?->format('Y-m-d'),
            'insurance_provider_id' => $patient->insurance_provider_id,
            'insurance_member_number' => $patient->insurance_member_number,
            'insurance_provider' => $this->whenLoaded('insuranceProvider', function () use ($patient) {
                $insuranceProvider = $patient->insuranceProvider;

                return [
                    'id' => $insuranceProvider?->id,
                    'name' => $insuranceProvider?->name,
                ];
            }),
            'created_at' => $patient->created_at,
        ];

        if ($this->clinicalAccess !== null) {
            $data['can_view_clinical_notes'] = $this->clinicalAccess->canView;
            $data['clinical_access_reason_required'] = $this->clinicalAccess->reasonRequired;
        }

        return $data;
    }

    private function patient(): Patient
    {
        /** @var Patient $patient */
        $patient = $this->resource;

        return $patient;
    }
}
