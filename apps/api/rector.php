<?php

declare(strict_types=1);

use Rector\Config\RectorConfig;
use RectorLaravel\Rector\Class_\ModelCastsPropertyToCastsMethodRector;
use RectorLaravel\Rector\Class_\TablePropertyToTableAttributeRector;
use RectorLaravel\Set\LaravelLevelSetList;

return RectorConfig::configure()
    ->withPaths([
        __DIR__.'/app',
        __DIR__.'/bootstrap/app.php',
        __DIR__.'/config',
        __DIR__.'/database',
        __DIR__.'/routes',
        __DIR__.'/tests',
    ])
    ->withSets([
        LaravelLevelSetList::UP_TO_LARAVEL_130,
    ])
    // larastan can't read the casts() method nor the #[Table] attribute yet —
    // keep $casts / $table as properties so model types stay analyzable
    ->withSkip([
        ModelCastsPropertyToCastsMethodRector::class,
        TablePropertyToTableAttributeRector::class,
    ]);
