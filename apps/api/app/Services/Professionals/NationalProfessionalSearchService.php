<?php

declare(strict_types=1);

namespace App\Services\Professionals;

use App\Contracts\ProfessionalRegistry;
use App\Data\Professionals\RegistryLicenseData;
use App\Data\Professionals\RegistryProfessionalData;
use App\Enums\Province;
use App\Exceptions\Professionals\ProfessionalRegistryUnavailableException;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * The Ministry of Health's Buscador Nacional de Profesionales de la Salud (#380, ADR 0032), the public face of REFEPS.
 * It has no API: it is a Drupal form, so a lookup reads the form's page for its `form_build_id` and posts the DNI to
 * it, and the answer comes in the page's HTML as JSON (`Drupal.settings.refepsProfesionales.allItems`). A page with
 * neither that, the «no results» notice nor the form rejecting the DNI is unreadable, never «not found». Only the DNI
 * leaves Clini. A failure keeps the registry unasked for a while, like the national medication search.
 */
final class NationalProfessionalSearchService implements ProfessionalRegistry
{
    private const int TIMEOUT_SECONDS = 4;

    /**
     * How long a failure keeps the registry unasked.
     */
    private const int PAUSE_SECONDS = 300;

    private const string PAUSED = 'professionals:national-professional-search:paused';

    private const string FORM_ID = 'argobar_consulta_refeps_profesionales';

    private const string NO_RESULTS = 'No se encuentran resultados';

    /**
     * The form's own answer to a DNI it won't search: about that DNI, not an outage, so it never pauses the registry.
     */
    private const string INVALID_DOCUMENT = 'El DNI ingresado no es válido';

    /**
     * Sanctions end on a calendar day in Argentina.
     */
    private const string TIMEZONE = 'America/Argentina/Buenos_Aires';

    public function available(): bool
    {
        return Config::boolean('services.national_professional_search.enabled') && ! Cache::has(self::PAUSED);
    }

    public function lookUp(string $documentNumber): array
    {
        $formBuildId = $this->formBuildId($this->page(fn () => $this->client()->get($this->url())));

        $page = $this->page(fn () => $this->client()->asForm()->post($this->url(), [
            'searchBy' => 'dni',
            'dni' => $documentNumber,
            'matricula' => '',
            'apellidonombre' => '',
            'form_build_id' => $formBuildId,
            'form_id' => self::FORM_ID,
            'op' => 'Consultar',
            // The form's honeypot: a person leaves it empty.
            'tarro_de_miel' => '',
        ]));

        $items = $this->items($page);
        $professionals = [];

        foreach ($items as $item) {
            $professional = is_array($item) ? $this->professional($item, $documentNumber) : null;

            if ($professional !== null) {
                $professionals[] = $professional;
            }
        }

        return $professionals;
    }

    private function client(): PendingRequest
    {
        return Http::withUserAgent(Config::string('services.national_professional_search.user_agent'))
            ->accept('text/html')
            ->timeout(self::TIMEOUT_SECONDS);
    }

    private function url(): string
    {
        return Config::string('services.national_professional_search.url');
    }

    /**
     * @param  callable(): Response  $request
     */
    private function page(callable $request): string
    {
        try {
            $response = $request();
        } catch (ConnectionException $exception) {
            throw $this->pausing(new ProfessionalRegistryUnavailableException('request', $exception));
        }

        if (! $response->successful()) {
            throw $this->pausing(new ProfessionalRegistryUnavailableException('status'));
        }

        return $response->body();
    }

    /**
     * The page carries more than one Drupal form, each with its own `form_build_id`: the one that counts is inside the
     * registry's form, before its `form_id`.
     */
    private function formBuildId(string $page): string
    {
        $formId = strpos($page, 'value="'.self::FORM_ID.'"');
        $formStart = $formId === false ? false : strrpos(substr($page, 0, $formId), '<form');

        if ($formId === false || $formStart === false
            || preg_match_all('/name="form_build_id" value="([^"]+)"/', substr($page, $formStart, $formId - $formStart), $matches) < 1) {
            throw $this->pausing(new ProfessionalRegistryUnavailableException('form'));
        }

        return $matches[1][count($matches[1]) - 1];
    }

    /**
     * @return array<mixed>
     */
    private function items(string $page): array
    {
        if (preg_match('/refepsProfesionales\.allItems\s*=\s*(\[.*?\]);\s*(?:Drupal\.|<\/script>)/s', $page, $match) === 1) {
            $items = $this->decoded($match[1]);

            if (is_array($items) && array_is_list($items)) {
                return $items;
            }
        } elseif (str_contains($page, self::NO_RESULTS) && ! str_contains($page, 'messages error')) {
            return [];
        } elseif (str_contains($page, 'messages error') && str_contains($page, self::INVALID_DOCUMENT)) {
            // The registry holds nobody under a DNI it won't even search.
            return [];
        }

        throw $this->pausing(new ProfessionalRegistryUnavailableException('response'));
    }

    private function decoded(string $json): mixed
    {
        try {
            return json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return null;
        }
    }

    private function pausing(ProfessionalRegistryUnavailableException $exception): ProfessionalRegistryUnavailableException
    {
        Cache::put(self::PAUSED, true, self::PAUSE_SECONDS);

        return $exception;
    }

    /**
     * Only a DNI row with exactly the document looked up: never anyone else the registry might answer with.
     *
     * @param  array<mixed>  $item
     */
    private function professional(array $item, string $documentNumber): ?RegistryProfessionalData
    {
        $document = self::text($item['nroDoc'] ?? null);

        if (self::text($item['tipoDoc'] ?? null) !== 'DNI' || $document === null
            || ltrim($document, '0') !== ltrim($documentNumber, '0')) {
            return null;
        }

        $licenses = [];

        foreach (is_array($item['profesiones'] ?? null) ? $item['profesiones'] : [] as $profession) {
            if (! is_array($profession) || self::text($profession['profesionReferencia'] ?? null) === null) {
                continue;
            }

            foreach (is_array($profession['matriculas'] ?? null) ? $profession['matriculas'] : [] as $license) {
                $parsed = is_array($license) ? $this->license($license, $profession) : null;

                if ($parsed !== null) {
                    $licenses[] = $parsed;
                }
            }
        }

        return new RegistryProfessionalData(
            refepsCode: self::text($item['codigo'] ?? null),
            active: mb_strtoupper(self::text($item['activo'] ?? null) ?? '') === 'SI',
            licenses: $licenses,
        );
    }

    /**
     * @param  array<mixed>  $license
     * @param  array<mixed>  $profession
     */
    private function license(array $license, array $profession): ?RegistryLicenseData
    {
        $number = self::text($license['matricula'] ?? null);
        $province = self::text($license['provinciaMatricula'] ?? null);

        if ($number === null || $province === null) {
            return null;
        }

        return new RegistryLicenseData(
            number: $number,
            province: Province::fromRegistryName($province),
            profession: (string) self::text($profession['profesionReferencia'] ?? null),
            specialty: self::text($profession['refepsEspecialidad'] ?? null),
            issuer: self::text($license['origenEmite'] ?? null),
            situation: self::text($license['situacionMatricula'] ?? null),
            sanctioned: $this->sanctioned($license),
        );
    }

    /**
     * A sanction runs while its end date hasn't passed. One without an end date, or with one this adapter can't read,
     * counts as running: a license is never called verified on a guess.
     *
     * @param  array<mixed>  $license
     */
    private function sanctioned(array $license): bool
    {
        $type = self::text($license['tipoSancion'] ?? null);
        $end = self::text($license['fechaFinSancion'] ?? null);

        if ($type === null && $end === null) {
            return false;
        }

        $endsOn = $end === null ? null : self::date($end);

        return $endsOn === null || $endsOn >= CarbonImmutable::now(self::TIMEZONE)->toDateString();
    }

    /**
     * «2026-12-31», «2026-12-31T00:00:00» or «31/12/2026» as Y-m-d.
     */
    private static function date(string $text): ?string
    {
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $text, $match) === 1) {
            [, $year, $month, $day] = $match;
        } elseif (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})/', $text, $match) === 1) {
            [, $day, $month, $year] = $match;
        } else {
            return null;
        }

        return checkdate((int) $month, (int) $day, (int) $year) ? "{$year}-{$month}-{$day}" : null;
    }

    /**
     * Plain spaces, trimmed; a blank value is null.
     */
    private static function text(mixed $value): ?string
    {
        if (! is_string($value) && ! is_int($value) && ! is_float($value)) {
            return null;
        }

        $text = trim((string) preg_replace('/[\s\x{00A0}]+/u', ' ', (string) $value));

        return $text === '' ? null : $text;
    }
}
