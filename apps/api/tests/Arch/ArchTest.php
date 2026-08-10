<?php

declare(strict_types=1);

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\DomainError;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Validation\ValidationException;

// Some sections (App\Services, App\Http\Resources) currently match zero classes; they exist so the first class added there is already held to the convention.

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

arch('code declares strict types')
    ->expect('App')
    ->toUseStrictTypes();

arch('no debugging or dangerous php constructs')
    ->preset()
    ->php();

arch('no insecure primitives')
    ->preset()
    ->security();

arch('controllers are suffixed')
    ->expect('App\Http\Controllers')
    ->toHaveSuffix('Controller');

arch('controllers extend the base controller')
    ->expect('App\Http\Controllers')
    ->toExtend(Controller::class)
    ->ignoring([Controller::class]); // the base cannot extend itself

arch('controllers do not touch the database facade')
    ->expect('App\Http\Controllers')
    ->not->toUse('Illuminate\Support\Facades\DB');

arch('controllers do not have private methods')
    ->expect('App\Http\Controllers')
    ->not->toHavePrivateMethods();

// Content scan, not an arch() expectation: Arch can only see imports/types, not $request->validate() calls.
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

arch('form requests are conventional')
    ->expect('App\Http\Requests')
    ->toExtend(FormRequest::class)
    ->toHaveSuffix('Request');

arch('resources are conventional')
    ->expect('App\Http\Resources')
    ->toExtend(JsonResource::class)
    ->toHaveSuffix('Resource');

// PHP can't narrow handle()'s native param type; narrowing is instead declared via @implements Action<TData>/@param, verified below (see CLAUDE.md).
arch('actions are suffixed and implement the Action contract')
    ->expect('App\Actions')
    ->toHaveSuffix('Action')
    ->toImplement(Action::class);

// Reflection scan: Arch expectations can't inspect method signatures.
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

// DomainException is excluded (abstract, unimplemented httpStatus()); kept as three separate arch() calls since ignoring() only applies to the assertion it's chained off of.
arch('domain exceptions are final')
    ->expect('App\Exceptions')
    ->toBeFinal()
    ->ignoring(DomainException::class);

arch('domain exceptions are suffixed')
    ->expect('App\Exceptions')
    ->toHaveSuffix('Exception')
    ->ignoring(DomainException::class);

arch('domain exceptions implement the DomainError contract')
    ->expect('App\Exceptions')
    ->toImplement(DomainError::class)
    ->ignoring(DomainException::class);

arch('actions do not throw Laravel input-validation exceptions')
    ->expect('App\Actions')
    ->not->toUse(ValidationException::class);

// Content scan, same approach as "controllers do not validate inline" above. The allow-list is issue #87's exact "Fuera de alcance" set of defensive assertions over states already made unreachable; the final assertion guards against the scan silently matching nothing.
test('no generic exceptions or abort() are used outside the allowed defensive sites', function () {
    $appDir = dirname(__DIR__, 2).'/app';
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($appDir, FilesystemIterator::SKIP_DOTS)
    );

    $allowedAbortSites = [
        'Http/Middleware/ResolveCurrentOrganization.php',
        'Support/CurrentOrganization.php',
        'Http/Controllers/Memberships/InvitationAcceptanceController.php',
    ];

    $genericExceptionPattern = '/throw\s+new\s+\\\\?(Exception|RuntimeException|DomainException)\b/';

    $offenders = [];
    $allowedMatches = 0;

    foreach ($iterator as $file) {
        if ($file->getExtension() !== 'php') {
            continue;
        }

        $relative = str_replace($appDir.DIRECTORY_SEPARATOR, '', $file->getPathname());
        $contents = (string) file_get_contents($file->getPathname());

        if (preg_match($genericExceptionPattern, $contents) === 1) {
            $offenders[] = $relative.' throws a generic exception for what should be a domain error';
        }

        if (str_contains($contents, 'abort(')) {
            if (in_array($relative, $allowedAbortSites, true)) {
                $allowedMatches++;
            } else {
                $offenders[] = $relative.' calls abort() outside the allowed defensive sites';
            }
        }
    }

    sort($offenders);
    expect($offenders)->toBe([], 'Generic exceptions or abort() found for what should be expected/domain flows: '.implode(', ', $offenders));
    expect($allowedMatches)->toBeGreaterThan(0);
});

// Vacuous today (nothing lives in App\Services yet); checks "at least one App\Contracts interface" since each Service implements its own, never a shared marker.
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

arch('data transfer objects are conventional')
    ->expect('App\Data')
    ->toBeFinal()
    ->toBeReadonly()
    ->toImplement(Data::class);

test('the seven modularized namespaces have no flat classes', function () {
    $root = dirname(__DIR__, 2).'/app';
    $namespacedDirs = [
        'Actions',
        'Services',
        'Data',
        'Http/Requests',
        'Http/Resources',
        'Http/Controllers',
        'Exceptions',
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
            if ($dir === 'Exceptions' && $basename === 'DomainException.php') {
                continue;
            }

            $offenders[] = $dir.'/'.$basename;
        }
    }

    sort($offenders);
    expect($offenders)->toBe([], 'These files sit directly under a modularized namespace root instead of a per-module subdirectory: '.implode(', ', $offenders));
});

arch('models extend eloquent')
    ->expect('App\Models')
    ->toExtend(Model::class);

arch('enums are enums')
    ->expect('App\Enums')
    ->toBeEnums();

// Business logic must not reach back into the HTTP layer — see ADR 0002.
arch('actions and services do not depend on the http layer')
    ->expect(['App\Actions', 'App\Services'])
    ->not->toUse('App\Http');

// Issue #106: seeders must stay literal/deterministic to run on the production image (composer install --no-dev); content scan since Arch can't see Model::factory() calls.
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
