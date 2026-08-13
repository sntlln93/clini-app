<?php

declare(strict_types=1);

namespace App\Enums;

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
}
