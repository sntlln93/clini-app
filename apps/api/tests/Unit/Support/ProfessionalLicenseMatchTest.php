<?php

declare(strict_types=1);

use App\Data\Professionals\RegistryLicenseData;
use App\Data\Professionals\RegistryProfessionalData;
use App\Enums\HealthProfession;
use App\Enums\ProfessionalLicenseMismatch;
use App\Enums\ProfessionalLicenseStatus;
use App\Enums\Province;
use App\Support\ProfessionalLicenseMatch;

function registryLicense(string $number = '6789', Province $province = Province::Cordoba, string $profession = 'Médico', string $situation = 'Habilitado', bool $sanctioned = false): RegistryLicenseData
{
    return new RegistryLicenseData($number, $province, $profession, 'Pediatría', 'COLEGIO DE PRUEBA', $situation, $sanctioned);
}

/**
 * @param  list<RegistryLicenseData>  $licenses
 * @return list<RegistryProfessionalData>
 */
function registryAnswer(array $licenses, bool $active = true): array
{
    return [new RegistryProfessionalData('541030123456', $active, $licenses)];
}

test('a license with the number, province and profession, enabled, is verified with what the registry says', function () {
    $license = registryLicense();

    $outcome = ProfessionalLicenseMatch::outcome('6789', Province::Cordoba, HealthProfession::Medico, registryAnswer([$license]));

    expect($outcome->status)->toBe(ProfessionalLicenseStatus::Verified)
        ->and($outcome->mismatchReason)->toBeNull()
        ->and($outcome->refepsCode)->toBe('541030123456')
        ->and($outcome->license)->toBe($license);
});

test('the registry holding it in another province, for another profession or with another number is not found', function (string $number, Province $province, HealthProfession $profession) {
    $outcome = ProfessionalLicenseMatch::outcome($number, $province, $profession, registryAnswer([registryLicense()]));

    expect($outcome->status)->toBe(ProfessionalLicenseStatus::Mismatch)
        ->and($outcome->mismatchReason)->toBe(ProfessionalLicenseMismatch::NotFound)
        ->and($outcome->refepsCode)->toBeNull()
        ->and($outcome->license)->toBeNull();
})->with([
    'another province' => ['6789', Province::SantaFe, HealthProfession::Medico],
    'another profession' => ['6789', Province::Cordoba, HealthProfession::Odontologo],
    'another number' => ['6790', Province::Cordoba, HealthProfession::Medico],
]);

test('an empty answer is not found', function () {
    expect(ProfessionalLicenseMatch::outcome('6789', Province::Cordoba, HealthProfession::Medico, [])->mismatchReason)
        ->toBe(ProfessionalLicenseMismatch::NotFound);
});

test('a match that is not backed says why, the most decisive reason first', function (bool $active, bool $sanctioned, string $situation, ProfessionalLicenseMismatch $reason) {
    $outcome = ProfessionalLicenseMatch::outcome('6789', Province::Cordoba, HealthProfession::Medico, registryAnswer([registryLicense(situation: $situation, sanctioned: $sanctioned)], $active));

    expect($outcome->status)->toBe(ProfessionalLicenseStatus::Mismatch)
        ->and($outcome->mismatchReason)->toBe($reason)
        ->and($outcome->license?->situation)->toBe($situation);
})->with([
    'inactive' => [false, true, 'Suspendido', ProfessionalLicenseMismatch::Inactive],
    'sanctioned' => [true, true, 'Habilitado', ProfessionalLicenseMismatch::Sanctioned],
    'not enabled' => [true, false, 'Suspendido', ProfessionalLicenseMismatch::NotEnabled],
]);

test('of two matches, the backed one decides', function () {
    $suspended = registryLicense(situation: 'Suspendido');
    $enabled = registryLicense();

    expect(ProfessionalLicenseMatch::outcome('6789', Province::Cordoba, HealthProfession::Medico, registryAnswer([$suspended, $enabled]))->license)
        ->toBe($enabled);
});

test('the profession and the situation compare without case or accents', function () {
    $outcome = ProfessionalLicenseMatch::outcome('6789', Province::Cordoba, HealthProfession::Medico, registryAnswer([registryLicense(profession: 'MEDICO', situation: 'HABILITADO')]));

    expect($outcome->status)->toBe(ProfessionalLicenseStatus::Verified);
});

test('a number compares by its digits only against a bare one, never across two letter prefixes', function (string $registered, string $declared, bool $same) {
    expect(ProfessionalLicenseMatch::sameNumber($registered, $declared))->toBe($same);
})->with([
    ['MP 6789', 'MP6789', true],
    ['MP 6789', 'm.p. 6789', true],
    ['6789', 'MP 6789', true],
    ['MN 006789', '6789', true],
    ['A9999', 'B9999', false],
    ['99999/T/V/99', '99999 T V 99', true],
    ['99999/T/V/99', '99999', false],
    ['6789', '6788', false],
    ['', '', false],
]);
