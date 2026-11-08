<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * A third-party source Clini depends on and watches for outages (#419, #425): each one names its outage's cache key,
 * where its settings live and how the team's mails call it.
 */
enum ExternalSource: string
{
    /**
     * The Buscador Nacional de Profesionales de la Salud (ADR 0032).
     */
    case ProfessionalRegistry = 'professional_registry';

    /**
     * The Buscador Nacional de Medicamentos (ADR 0031).
     */
    case MedicationSearch = 'medication_search';

    /**
     * Where its outage lives in the cache.
     */
    public function outageKey(): string
    {
        return match ($this) {
            self::ProfessionalRegistry => 'professionals:national-professional-search:outage',
            self::MedicationSearch => 'medications:national-medication-search:outage',
        };
    }

    /**
     * Its block in config/services.php, which holds `outage_alert_minutes`.
     */
    public function configKey(): string
    {
        return match ($this) {
            self::ProfessionalRegistry => 'services.national_professional_search',
            self::MedicationSearch => 'services.national_medication_search',
        };
    }

    /**
     * How the team's mails call it, starting a sentence.
     */
    public function label(): string
    {
        return match ($this) {
            self::ProfessionalRegistry => 'El registro nacional de profesionales',
            self::MedicationSearch => 'El buscador nacional de medicamentos',
        };
    }

    /**
     * Its official name, as the Ministry of Health publishes it.
     */
    public function officialName(): string
    {
        return match ($this) {
            self::ProfessionalRegistry => 'Buscador Nacional de Profesionales de la Salud',
            self::MedicationSearch => 'Buscador Nacional de Medicamentos',
        };
    }
}
