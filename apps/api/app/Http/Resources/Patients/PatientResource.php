<?php

declare(strict_types=1);

namespace App\Http\Resources\Patients;

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
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $patient = $this->patient();

        // PHPStan/Larastan can't infer attribute types from Patient::casts()
        // (a Laravel 11+ method-based cast declaration; parseModelCastsMethod
        // is off) — same limitation Membership::permissions() works around.
        /** @var Carbon|null $birthDate */
        $birthDate = $patient->birth_date;

        return [
            'id' => $patient->id,
            'name' => $patient->name,
            'email' => $patient->email,
            'phone' => $patient->phone,
            'document_type' => $patient->document_type,
            'document_number' => $patient->document_number,
            'sex' => $patient->sex,
            'birth_date' => $birthDate?->format('Y-m-d'),
            'insurance_provider_id' => $patient->insurance_provider_id,
            'insurance_provider' => $this->whenLoaded('insuranceProvider', function () use ($patient) {
                $insuranceProvider = $patient->insuranceProvider;

                return [
                    'id' => $insuranceProvider?->id,
                    'name' => $insuranceProvider?->name,
                ];
            }),
            'created_at' => $patient->created_at,
        ];
    }

    private function patient(): Patient
    {
        /** @var Patient $patient */
        $patient = $this->resource;

        return $patient;
    }
}
