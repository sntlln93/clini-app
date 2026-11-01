<?php

declare(strict_types=1);

use App\Enums\Province;

test('every province has its own two-digit INDEC code', function () {
    $codes = array_map(fn (Province $province) => $province->indecCode(), Province::cases());

    expect($codes)->toHaveCount(24)
        ->and(array_unique($codes))->toHaveCount(24)
        ->and(array_filter($codes, fn (string $code) => preg_match('/^\d{2}$/', $code) !== 1))->toBe([]);
});

test('the INDEC codes are the jurisdictions the CUIR uses', function (Province $province, string $code) {
    expect($province->indecCode())->toBe($code);
})->with([
    [Province::CiudadAutonomaDeBuenosAires, '02'],
    [Province::BuenosAires, '06'],
    [Province::Cordoba, '14'],
    [Province::LaRioja, '46'],
    [Province::Tucuman, '90'],
    [Province::TierraDelFuego, '94'],
]);

test('every province name the national professional search writes resolves to its province', function (string $name, Province $province) {
    expect(Province::fromRegistryName($name))->toBe($province);
})->with([
    ['CABA', Province::CiudadAutonomaDeBuenosAires],
    ['Buenos Aires', Province::BuenosAires],
    ['Córdoba', Province::Cordoba],
    ['Entre Ríos', Province::EntreRios],
    ['Neuquén', Province::Neuquen],
    ['Río Negro', Province::RioNegro],
    ['Santiago del Estero', Province::SantiagoDelEstero],
    ['Tucumán', Province::Tucuman],
    ['Tierra del Fuego', Province::TierraDelFuego],
    ['  la rioja ', Province::LaRioja],
]);

test('every province resolves from its own label', function () {
    foreach (Province::cases() as $province) {
        expect(Province::fromRegistryName($province->label()))->toBe($province);
    }
});

test('a name it doesn\'t know is no province, never a guess', function () {
    expect(Province::fromRegistryName('Buenos'))->toBeNull()
        ->and(Province::fromRegistryName(''))->toBeNull();
});
