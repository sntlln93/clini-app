<?php

declare(strict_types=1);

namespace App\Enums;

use App\Support\FoldedText;

/**
 * The professions a practice's professional declares a license for (#380). Each label is the exact `profesionReferencia`
 * the Buscador Nacional de Profesionales de la Salud (REFEPS) writes, which a license is matched against: adding a
 * profession is adding a case with its REFEPS label, and a profession the registry answers without a case here never
 * reaches the specialties catalog (#387). None of them says who may prescribe medication: that is #314's.
 */
enum HealthProfession: string
{
    case Medico = 'medico';
    case Odontologo = 'odontologo';
    case Psicologo = 'psicologo';
    case Kinesiologo = 'kinesiologo';
    case Nutricionista = 'nutricionista';
    case Fonoaudiologo = 'fonoaudiologo';
    case Obstetricia = 'obstetricia';
    case TerapistaOcupacional = 'terapista-ocupacional';
    case Psicopedagogo = 'psicopedagogo';
    case Psicomotricista = 'psicomotricista';
    case Podologo = 'podologo';
    case Bioquimico = 'bioquimico';
    case Farmaceutico = 'farmaceutico';
    case LicenciadoEnEnfermeria = 'licenciado-en-enfermeria';
    case Enfermero = 'enfermero';
    case TrabajadorSocial = 'trabajador-social';
    case AcompananteTerapeutico = 'acompanante-terapeutico';

    public function label(): string
    {
        return match ($this) {
            self::Medico => 'Médico',
            self::Odontologo => 'Odontólogo',
            self::Psicologo => 'Psicólogo',
            self::Kinesiologo => 'Kinesiólogo',
            self::Nutricionista => 'Nutricionista',
            self::Fonoaudiologo => 'Fonoaudiólogo',
            self::Obstetricia => 'Lic. Obstetricia',
            self::TerapistaOcupacional => 'Terapista ocupacional',
            self::Psicopedagogo => 'Psicopedagogo',
            self::Psicomotricista => 'Psicomotricista',
            self::Podologo => 'Podólogo',
            self::Bioquimico => 'Bioquímico',
            self::Farmaceutico => 'Farmacéutico',
            self::LicenciadoEnEnfermeria => 'Licenciado en enfermería',
            self::Enfermero => 'Enfermero',
            self::TrabajadorSocial => 'Trabajador social',
            self::AcompananteTerapeutico => 'Acompañante terapéutico',
        };
    }

    /**
     * The profession whose label is the registry's `profesionReferencia`, folded: null for one Clini doesn't know.
     */
    public static function fromRegistryName(string $name): ?self
    {
        $folded = FoldedText::fold($name);

        foreach (self::cases() as $profession) {
            if (FoldedText::fold($profession->label()) === $folded) {
                return $profession;
            }
        }

        return null;
    }
}
