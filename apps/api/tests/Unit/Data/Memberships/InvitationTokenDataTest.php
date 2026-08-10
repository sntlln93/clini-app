<?php

declare(strict_types=1);

use App\Data\Memberships\InvitationTokenData;

test('toArray returns the constructor token under the token key', function () {
    $dto = new InvitationTokenData(token: 'raw-token-value');

    expect($dto->toArray())->toBe([
        'token' => 'raw-token-value',
    ]);
});

test('toArray keys stay in sync with the promoted constructor parameters', function () {
    $dto = new InvitationTokenData(token: 'raw-token-value');

    $constructor = new ReflectionClass(InvitationTokenData::class)->getConstructor();
    $parameterNames = array_map(
        fn (ReflectionParameter $parameter): string => $parameter->getName(),
        $constructor->getParameters(),
    );

    $arrayKeys = array_keys($dto->toArray());

    sort($parameterNames);
    sort($arrayKeys);

    expect($arrayKeys)->toBe($parameterNames);
});
