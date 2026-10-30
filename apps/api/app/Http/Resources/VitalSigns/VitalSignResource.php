<?php

declare(strict_types=1);

namespace App\Http\Resources\VitalSigns;

use App\Models\VitalSign;
use App\Models\VitalSignVersion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shapes one measurement (#361): its current values with every earlier version, since it is append-only (ADR 0019),
 * how and why it was annulled, and its author's name. The BMI is never stored: it comes from the weight and the
 * height of the same version. The controller eager-loads what it renders, see VitalSignController::RELATIONS.
 *
 * @mixin VitalSign
 */
class VitalSignResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $vitalSign = $this->vitalSign();
        /** @var VitalSignVersion $current */
        $current = $vitalSign->versions->last();
        $annulment = $vitalSign->annulment;

        return [
            'id' => $vitalSign->id,
            'appointment_id' => $vitalSign->appointment_id,
            'patient_id' => $vitalSign->patient_id,
            'membership_id' => $vitalSign->membership_id,
            'measured_at' => $vitalSign->measured_at,
            'version' => $current->version,
            'amended_at' => $current->version > 1 ? $current->created_at : null,
            'values' => self::values($current),
            'annulment' => $annulment === null ? null : [
                'reason' => $annulment->reason,
                'created_at' => $annulment->created_at,
            ],
            'versions' => $vitalSign->versions->map(fn (VitalSignVersion $version): array => [
                'version' => $version->version,
                'reason' => $version->reason,
                'created_at' => $version->created_at,
                'values' => self::values($version),
            ])->values(),
            'author_name' => $vitalSign->author?->user?->name,
        ];
    }

    /**
     * @return array<string, int|float|null>
     */
    public static function values(VitalSignVersion $version): array
    {
        return [
            'weight_kg' => $version->weight_kg,
            'height_cm' => $version->height_cm,
            'bmi' => self::bmi($version->weight_kg, $version->height_cm),
            'head_circumference_cm' => $version->head_circumference_cm,
            'waist_circumference_cm' => $version->waist_circumference_cm,
            'systolic_mmhg' => $version->systolic_mmhg,
            'diastolic_mmhg' => $version->diastolic_mmhg,
            'capillary_glucose_mg_dl' => $version->capillary_glucose_mg_dl,
            'heart_rate_bpm' => $version->heart_rate_bpm,
            'respiratory_rate_rpm' => $version->respiratory_rate_rpm,
            'temperature_c' => $version->temperature_c,
            'oxygen_saturation_pct' => $version->oxygen_saturation_pct,
        ];
    }

    private static function bmi(?float $weightKg, ?float $heightCm): ?float
    {
        if ($weightKg === null || $heightCm === null) {
            return null;
        }

        return round($weightKg / (($heightCm / 100) ** 2), 1);
    }

    private function vitalSign(): VitalSign
    {
        /** @var VitalSign $vitalSign */
        $vitalSign = $this->resource;

        return $vitalSign;
    }
}
