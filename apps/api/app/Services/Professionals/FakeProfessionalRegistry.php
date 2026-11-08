<?php

declare(strict_types=1);

namespace App\Services\Professionals;

use App\Contracts\ProfessionalRegistry;
use App\Data\Professionals\RegistryLicenseData;
use App\Data\Professionals\RegistryProfessionalData;
use App\Enums\Province;

/**
 * The registry dev and e2e use (`PROFESSIONAL_REGISTRY=fake`, #387): it answers, without leaving Clini, for the made-up
 * DNIs of the seeder's fixture (`DatabaseSeeder`), and for any other DNI as the real registry does for one it doesn't
 * hold. It is never bound in production (`AppServiceProvider`). Its DNIs are past the ones issued so far, so the
 * seeder's professionals never stand for a real person.
 */
final class FakeProfessionalRegistry implements ProfessionalRegistry
{
    /**
     * Each DNI's professions as the registry writes them, with their specialty (or none) and their licenses.
     *
     * @var list<array{document_number: string, refeps_code: string, professions: list<array{profession: string, specialty: string|null, licenses: list<array{number: string, province: Province, issuer: string}>}>}>
     */
    public const array PROFESSIONALS = [
        [
            'document_number' => '99000001',
            'refeps_code' => '541099000001',
            'professions' => [[
                'profession' => 'Médico',
                'specialty' => 'Pediatría',
                'licenses' => [
                    ['number' => '120034', 'province' => Province::CiudadAutonomaDeBuenosAires, 'issuer' => 'MINISTERIO DE SALUD DE LA NACION'],
                    ['number' => 'MP 30456', 'province' => Province::Cordoba, 'issuer' => 'MEDICOS DE LA PROVINCIA DE CORDOBA, Consejo de'],
                ],
            ]],
        ],
        [
            'document_number' => '99000002',
            'refeps_code' => '541099000002',
            'professions' => [[
                'profession' => 'Médico',
                'specialty' => 'Cardiología',
                'licenses' => [
                    ['number' => '118207', 'province' => Province::CiudadAutonomaDeBuenosAires, 'issuer' => 'MINISTERIO DE SALUD DE LA NACION'],
                ],
            ]],
        ],
    ];

    public function available(): bool
    {
        return true;
    }

    public function lookUp(string $documentNumber): array
    {
        $found = array_values(array_filter(self::PROFESSIONALS, fn (array $professional): bool => $professional['document_number'] === $documentNumber));

        if ($found === []) {
            return [];
        }

        $professional = $found[0];
        $licenses = [];

        foreach ($professional['professions'] as $profession) {
            foreach ($profession['licenses'] as $license) {
                $licenses[] = new RegistryLicenseData(
                    number: $license['number'],
                    province: $license['province'],
                    profession: $profession['profession'],
                    specialty: $profession['specialty'],
                    issuer: $license['issuer'],
                    situation: 'Habilitado',
                    sanctioned: false,
                );
            }
        }

        return [new RegistryProfessionalData(refepsCode: $professional['refeps_code'], active: true, licenses: $licenses)];
    }
}
