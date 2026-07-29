<?php

declare(strict_types=1);

use App\Contracts\Action;
use App\Contracts\Data;
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
 | Some sections (App\Services, App\Http\Resources) currently match zero
 | classes — nothing lives there yet — so they pass vacuously. They exist so
 | the very first class added under those namespaces is already held to the
 | convention, instead of drifting first and getting a rule retrofitted later.
 */

/**
 * Recursively lists the fully-qualified class names for the PHP files under
 * a directory, assuming it maps 1:1 to the given namespace (PSR-4).
 *
 * @return array<int, class-string>
 */
function classesInNamespace(string $namespace, string $directory): array
{
    if (! is_dir($directory)) {
        return [];
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS)
    );

    $classes = [];
    foreach ($iterator as $file) {
        if ($file->getExtension() !== 'php') {
            continue;
        }

        $relative = str_replace([$directory.DIRECTORY_SEPARATOR, '.php'], '', $file->getPathname());
        /** @var class-string $class */
        $class = $namespace.'\\'.str_replace(DIRECTORY_SEPARATOR, '\\', $relative);
        $classes[] = $class;
    }

    return $classes;
}

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

// --- Actions: in-app business logic, contract-shaped ------------------------

// The native `handle(Data $dto)` param can't be narrowed (PHP forbids
// narrowing a parameter type); narrowing is declared via `@implements
// Action<TData>` on the class and `@param TData $dto` on the method, and
// verified below.
arch('actions are suffixed and implement the Action contract')
    ->expect('App\Actions')
    ->toHaveSuffix('Action')
    ->toImplement(Action::class);

// Arch expectations can't inspect method signatures, so "exactly one
// handle(Data $dto) method" is a reflection scan instead.
test('actions expose exactly one handle(Data $dto) method', function () {
    $offenders = [];

    foreach (classesInNamespace('App\Actions', dirname(__DIR__, 2).'/app/Actions') as $class) {
        $reflection = new ReflectionClass($class);
        $publicMethods = array_values(array_filter(
            $reflection->getMethods(ReflectionMethod::IS_PUBLIC),
            fn (ReflectionMethod $method): bool => $method->getDeclaringClass()->getName() === $class
                && $method->getName() !== '__construct',
        ));

        if (count($publicMethods) !== 1 || $publicMethods[0]->getName() !== 'handle') {
            $offenders[] = $class;

            continue;
        }

        $parameters = $publicMethods[0]->getParameters();
        $parameterType = $parameters[0]->getType() ?? null;

        $isDtoParam = count($parameters) === 1
            && $parameterType instanceof ReflectionNamedType
            && ! $parameterType->isBuiltin()
            && is_a($parameterType->getName(), Data::class, true);

        if (! $isDtoParam) {
            $offenders[] = $class;
        }
    }

    sort($offenders);
    expect($offenders)->toBe([], 'These actions do not expose exactly one handle(Data $dto) method: '.implode(', ', $offenders));
});

// --- Services: business logic that talks to third-party APIs/SDKs ----------

// Each Service implements its own domain interface in App\Contracts (e.g.
// `TwilioService implements SmsGateway`), never a common marker interface —
// so this is "at least one App\Contracts interface", not a fixed one.
// Vacuous today: nothing lives in App\Services yet.
test('services implement at least one App\Contracts interface', function () {
    $offenders = [];

    foreach (classesInNamespace('App\Services', dirname(__DIR__, 2).'/app/Services') as $class) {
        $reflection = new ReflectionClass($class);
        $implementsContract = false;

        foreach ($reflection->getInterfaceNames() as $interface) {
            if (str_starts_with($interface, 'App\Contracts\\')) {
                $implementsContract = true;

                break;
            }
        }

        if (! $implementsContract) {
            $offenders[] = $class;
        }
    }

    sort($offenders);
    expect($offenders)->toBe([], 'These services do not implement any App\Contracts interface: '.implode(', ', $offenders));
});

// --- DTOs: passive data containers ------------------------------------------

arch('data transfer objects are conventional')
    ->expect('App\Data')
    ->toBeFinal()
    ->toBeReadonly()
    ->toImplement(Data::class);

// --- Modularization: per-module subdirectories ------------------------------

// The six modularized namespaces (Actions, Services, Data, Http\Requests,
// Http\Resources, Http\Controllers) must group classes under a per-module
// subdirectory — no class sits directly at the namespace root, except the
// framework-mandated base Controller. App\Models and App\Enums stay flat.
test('the six modularized namespaces have no flat classes', function () {
    $root = dirname(__DIR__, 2).'/app';
    $namespacedDirs = [
        'Actions',
        'Services',
        'Data',
        'Http/Requests',
        'Http/Resources',
        'Http/Controllers',
    ];

    $offenders = [];
    foreach ($namespacedDirs as $dir) {
        $path = $root.'/'.$dir;
        if (! is_dir($path)) {
            continue;
        }

        foreach (glob($path.'/*.php') ?: [] as $file) {
            $basename = basename($file);
            if ($dir === 'Http/Controllers' && $basename === 'Controller.php') {
                continue;
            }

            $offenders[] = $dir.'/'.$basename;
        }
    }

    sort($offenders);
    expect($offenders)->toBe([], 'These files sit directly under a modularized namespace root instead of a per-module subdirectory: '.implode(', ', $offenders));
});

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

// --- Seeders: literal, deterministic, factory-free --------------------------

// Acceptance criterion of issue #106: seeders must be literal and
// deterministic so they run on the production image (composer install
// --no-dev, no dev dependencies) and are safely re-runnable. Arch
// expectations can't see method calls like Model::factory(), so this is a
// content scan, same approach as "controllers do not validate inline"
// above. No baseline: every offender fails, naming the exact file.
test('seeders are literal, deterministic and factory-free', function () {
    $seedersDir = dirname(__DIR__, 2).'/database/seeders';
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($seedersDir, FilesystemIterator::SKIP_DOTS)
    );

    $forbiddenPrimitives = ['::factory(', '->factory(', 'fake(', 'inRandomOrder(', 'random_int('];

    $offenders = [];
    foreach ($iterator as $file) {
        if ($file->getExtension() !== 'php') {
            continue;
        }

        $contents = (string) file_get_contents($file->getPathname());

        foreach ($forbiddenPrimitives as $primitive) {
            if (str_contains($contents, $primitive)) {
                $offenders[] = $file->getBasename().' uses '.$primitive;
            }
        }
    }

    sort($offenders);
    expect($offenders)->toBe([], 'These seeder files use a non-deterministic or factory-based primitive: '.implode(', ', $offenders));
});
