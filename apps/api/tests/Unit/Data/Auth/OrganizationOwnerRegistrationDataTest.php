<?php

declare(strict_types=1);

use App\Data\Auth\OrganizationOwnerRegistrationData;

test('toArray returns every constructor value under its own key', function () {
    $dto = new OrganizationOwnerRegistrationData(
        name: 'Ana Owner',
        email: 'ana@example.com',
        password: 'password123',
        organizationName: 'Clínica Norte',
        timezone: 'America/Argentina/Buenos_Aires',
    );

    expect($dto->toArray())->toBe([
        'name' => 'Ana Owner',
        'email' => 'ana@example.com',
        'password' => 'password123',
        'organizationName' => 'Clínica Norte',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ]);
});

test('toArray keys stay in sync with the promoted constructor parameters', function () {
    $dto = new OrganizationOwnerRegistrationData(
        name: 'Ana Owner',
        email: 'ana@example.com',
        password: 'password123',
        organizationName: 'Clínica Norte',
        timezone: 'America/Argentina/Buenos_Aires',
    );

    $constructor = new ReflectionClass(OrganizationOwnerRegistrationData::class)->getConstructor();
    $parameterNames = array_map(
        fn (ReflectionParameter $parameter): string => $parameter->getName(),
        $constructor->getParameters(),
    );

    $arrayKeys = array_keys($dto->toArray());

    sort($parameterNames);
    sort($arrayKeys);

    expect($arrayKeys)->toBe($parameterNames);
});
