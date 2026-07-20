<?php

declare(strict_types=1);

use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Resources\Json\JsonResource;

/*
 |-----------------------------------------------------------------------------
 | Architecture tests
 |-----------------------------------------------------------------------------
 |
 | These encode the code-quality rules from CLAUDE.md so they are enforced
 | automatically. Rules are enforced STRICTLY, with no baseline. A failing
 | arch test points at exactly what regressed. Fix it by refactoring, never
 | by adding an exception.
 |
 | Some sections (App\Actions, App\Services, App\Enums, FormRequests,
 | Resources) currently match zero classes — nothing lives there yet — so they
 | pass vacuously. They exist so the very first class added under those
 | namespaces is already held to the convention, instead of drifting first and
 | getting a rule retrofitted later.
 */

// --- Whole-app hygiene ------------------------------------------------------

arch('code declares strict types')
    ->expect('App')
    ->toUseStrictTypes();

arch('no debugging or dangerous php constructs')
    ->preset()
    ->php();

arch('no insecure primitives')
    ->preset()
    ->security();

// --- Controllers: thin, conventional ----------------------------------------

arch('controllers are suffixed')
    ->expect('App\Http\Controllers')
    ->toHaveSuffix('Controller');

arch('controllers extend the base controller')
    ->expect('App\Http\Controllers')
    ->toExtend(Controller::class)
    ->ignoring([Controller::class]); // the base cannot extend itself

// Thin controllers own no persistence: the DB facade (transactions, raw
// queries) belongs in the Domain/Application layer.
arch('controllers do not touch the database facade')
    ->expect('App\Http\Controllers')
    ->not->toUse('Illuminate\Support\Facades\DB');

// "Never $request->validate() in a controller — always inject a FormRequest."
// Arch expectations can only see imports/types, not method calls on $request,
// so this is a content scan. No baseline: every offender fails, so the
// message is the exact list of controllers to move onto FormRequests.
test('controllers do not validate inline', function () {
    $controllersDir = dirname(__DIR__, 2).'/app/Http/Controllers';
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($controllersDir, FilesystemIterator::SKIP_DOTS)
    );

    $offenders = [];
    foreach ($iterator as $file) {
        if ($file->getExtension() !== 'php') {
            continue;
        }

        $contents = (string) file_get_contents($file->getPathname());
        if (str_contains($contents, '->validate(')) {
            $offenders[] = $file->getBasename();
        }
    }

    sort($offenders);
    expect($offenders)->toBe([], 'These controllers validate inline; inject a FormRequest instead: '.implode(', ', $offenders));
});

// --- FormRequests -----------------------------------------------------------

arch('form requests are conventional')
    ->expect('App\Http\Requests')
    ->toExtend(FormRequest::class)
    ->toHaveSuffix('Request');

// --- API Resources ----------------------------------------------------------

arch('resources are conventional')
    ->expect('App\Http\Resources')
    ->toExtend(JsonResource::class)
    ->toHaveSuffix('Resource');

// --- Models: thin, framework-rooted -----------------------------------------

arch('models extend eloquent')
    ->expect('App\Models')
    ->toExtend(Model::class);

// --- Enums --------------------------------------------------------------

arch('enums are enums')
    ->expect('App\Enums')
    ->toBeEnums();

// --- Layering: dependencies point inward ------------------------------------

// Business logic must not reach back into the HTTP layer — see ADR 0002.
arch('actions and services do not depend on the http layer')
    ->expect(['App\Actions', 'App\Services'])
    ->not->toUse('App\Http');
