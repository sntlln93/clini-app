<?php

declare(strict_types=1);

namespace App\Enums;

use App\Support\FoldedText;

/**
 * The 23 Argentine provinces plus the City of Buenos Aires (CABA). Each
 * case's backing value is the kebab-case, tilde-free slug used by
 * calendariosnacionales.com in its provincial holidays path
 * (`/ar/v1/{year}/provincias/{slug}.json`).
 */
enum Province: string
{
    case BuenosAires = 'buenos-aires';
    case CiudadAutonomaDeBuenosAires = 'caba';
    case Catamarca = 'catamarca';
    case Chaco = 'chaco';
    case Chubut = 'chubut';
    case Cordoba = 'cordoba';
    case Corrientes = 'corrientes';
    case EntreRios = 'entre-rios';
    case Formosa = 'formosa';
    case Jujuy = 'jujuy';
    case LaPampa = 'la-pampa';
    case LaRioja = 'la-rioja';
    case Mendoza = 'mendoza';
    case Misiones = 'misiones';
    case Neuquen = 'neuquen';
    case RioNegro = 'rio-negro';
    case Salta = 'salta';
    case SanJuan = 'san-juan';
    case SanLuis = 'san-luis';
    case SantaCruz = 'santa-cruz';
    case SantaFe = 'santa-fe';
    case SantiagoDelEstero = 'santiago-del-estero';
    case TierraDelFuego = 'tierra-del-fuego';
    case Tucuman = 'tucuman';

    public function label(): string
    {
        return match ($this) {
            self::BuenosAires => 'Buenos Aires',
            self::CiudadAutonomaDeBuenosAires => 'Ciudad Autónoma de Buenos Aires',
            self::Catamarca => 'Catamarca',
            self::Chaco => 'Chaco',
            self::Chubut => 'Chubut',
            self::Cordoba => 'Córdoba',
            self::Corrientes => 'Corrientes',
            self::EntreRios => 'Entre Ríos',
            self::Formosa => 'Formosa',
            self::Jujuy => 'Jujuy',
            self::LaPampa => 'La Pampa',
            self::LaRioja => 'La Rioja',
            self::Mendoza => 'Mendoza',
            self::Misiones => 'Misiones',
            self::Neuquen => 'Neuquén',
            self::RioNegro => 'Río Negro',
            self::Salta => 'Salta',
            self::SanJuan => 'San Juan',
            self::SanLuis => 'San Luis',
            self::SantaCruz => 'Santa Cruz',
            self::SantaFe => 'Santa Fe',
            self::SantiagoDelEstero => 'Santiago del Estero',
            self::TierraDelFuego => 'Tierra del Fuego',
            self::Tucuman => 'Tucumán',
        };
    }

    /**
     * The province's two-digit INDEC code, the jurisdiction the CUIR of a prescription carries (Res. MS 2214/2025,
     * #380).
     */
    public function indecCode(): string
    {
        return match ($this) {
            self::CiudadAutonomaDeBuenosAires => '02',
            self::BuenosAires => '06',
            self::Catamarca => '10',
            self::Cordoba => '14',
            self::Corrientes => '18',
            self::Chaco => '22',
            self::Chubut => '26',
            self::EntreRios => '30',
            self::Formosa => '34',
            self::Jujuy => '38',
            self::LaPampa => '42',
            self::LaRioja => '46',
            self::Mendoza => '50',
            self::Misiones => '54',
            self::Neuquen => '58',
            self::RioNegro => '62',
            self::Salta => '66',
            self::SanJuan => '70',
            self::SanLuis => '74',
            self::SantaCruz => '78',
            self::SantaFe => '82',
            self::SantiagoDelEstero => '86',
            self::Tucuman => '90',
            self::TierraDelFuego => '94',
        };
    }

    /**
     * The province a national registry names (#380): the Buscador Nacional de Profesionales writes «CABA», «Córdoba»
     * or «Tierra del Fuego», compared here without case or accents. Null for a name it doesn't know, never a guess.
     */
    public static function fromRegistryName(string $name): ?self
    {
        $folded = FoldedText::fold($name);

        foreach (self::cases() as $province) {
            if (in_array($folded, $province->registryNames(), true)) {
                return $province;
            }
        }

        return null;
    }

    /**
     * @return list<string> folded
     */
    private function registryNames(): array
    {
        $names = [FoldedText::fold($this->label())];

        return match ($this) {
            self::CiudadAutonomaDeBuenosAires => [...$names, 'caba', 'capital federal', 'ciudad de buenos aires'],
            self::TierraDelFuego => [...$names, 'tierra del fuego, antartida e islas del atlantico sur'],
            default => $names,
        };
    }
}
