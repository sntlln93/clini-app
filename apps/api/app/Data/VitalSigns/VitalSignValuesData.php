<?php

declare(strict_types=1);

namespace App\Data\VitalSigns;

use App\Contracts\Data;

/**
 * The values of one measurement, every one optional; the keys of `toArray()` are the version's columns.
 */
final readonly class VitalSignValuesData implements Data
{
    public function __construct(
        public ?float $weightKg = null,
        public ?float $heightCm = null,
        public ?float $headCircumferenceCm = null,
        public ?float $waistCircumferenceCm = null,
        public ?int $systolicMmhg = null,
        public ?int $diastolicMmhg = null,
        public ?int $capillaryGlucoseMgDl = null,
        public ?int $heartRateBpm = null,
        public ?int $respiratoryRateRpm = null,
        public ?float $temperatureC = null,
        public ?int $oxygenSaturationPct = null,
    ) {}

    /**
     * @return array<string, int|float|null>
     */
    public function toArray(): array
    {
        return [
            'weight_kg' => $this->weightKg,
            'height_cm' => $this->heightCm,
            'head_circumference_cm' => $this->headCircumferenceCm,
            'waist_circumference_cm' => $this->waistCircumferenceCm,
            'systolic_mmhg' => $this->systolicMmhg,
            'diastolic_mmhg' => $this->diastolicMmhg,
            'capillary_glucose_mg_dl' => $this->capillaryGlucoseMgDl,
            'heart_rate_bpm' => $this->heartRateBpm,
            'respiratory_rate_rpm' => $this->respiratoryRateRpm,
            'temperature_c' => $this->temperatureC,
            'oxygen_saturation_pct' => $this->oxygenSaturationPct,
        ];
    }
}
