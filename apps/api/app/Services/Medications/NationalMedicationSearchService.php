<?php

declare(strict_types=1);

namespace App\Services\Medications;

use App\Contracts\MedicationSource;
use App\Data\Medications\MedicationProductData;
use App\Exceptions\Medications\MedicationSourceUnavailableException;
use App\Support\MedicationComposition;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * The Ministry of Health's Buscador Nacional de Medicamentos (#377, ADR 0031): the JSON endpoint its public page uses,
 * undocumented (#379 asks for a documented one). One POST per term answers every product whose name, drug, laboratory
 * or troquel contains it, without pagination. Only the term leaves Clini, never anything about a patient or a
 * professional. A failure keeps the source unasked for a while, so a slow or broken source doesn't slow every search
 * down.
 */
final class NationalMedicationSearchService implements MedicationSource
{
    private const int TIMEOUT_SECONDS = 4;

    /**
     * How long a failure keeps the source unasked.
     */
    private const int PAUSE_SECONDS = 300;

    private const string PAUSED = 'medications:national-medication-search:paused';

    public function available(): bool
    {
        return Config::boolean('services.national_medication_search.enabled') && ! Cache::has(self::PAUSED);
    }

    public function search(string $term): array
    {
        try {
            $response = Http::acceptJson()
                ->asJson()
                ->withUserAgent(Config::string('services.national_medication_search.user_agent'))
                ->timeout(self::TIMEOUT_SECONDS)
                ->post(rtrim(Config::string('services.national_medication_search.url'), '/').'/api/vademecum', ['searchdata' => $term]);
        } catch (ConnectionException $exception) {
            throw $this->pausing(new MedicationSourceUnavailableException('request', $exception));
        }

        $rows = $response->successful() ? $this->decoded($response->body()) : null;

        if (! is_array($rows) || ! array_is_list($rows)) {
            throw $this->pausing(new MedicationSourceUnavailableException($response->successful() ? 'response' : 'status'));
        }

        $products = [];

        foreach ($rows as $row) {
            $product = is_array($row) ? $this->product($row) : null;

            if ($product !== null) {
                $products[] = $product;
            }
        }

        return $products;
    }

    private function pausing(MedicationSourceUnavailableException $exception): MedicationSourceUnavailableException
    {
        Cache::put(self::PAUSED, true, self::PAUSE_SECONDS);

        return $exception;
    }

    private function decoded(string $body): mixed
    {
        try {
            return json_decode($body, true, flags: JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * A row without a GTIN or a name can't be kept: the GTIN is the catalog's key.
     *
     * @param  array<mixed>  $row
     */
    private function product(array $row): ?MedicationProductData
    {
        $gtin = self::gtin($row['GTIN1'] ?? null);
        $name = self::text($row['NOMBRE'] ?? null);

        if ($gtin === null || $name === null) {
            return null;
        }

        $drug = self::text($row['DROGA'] ?? null);
        $controlMark = self::text($row['D_MARCA_CONTROLADO'] ?? null);

        return new MedicationProductData(
            gtin: $gtin,
            name: $name,
            presentation: self::text($row['PRESENTACION'] ?? null),
            pharmaceuticalForm: self::text($row['FORMA'] ?? null),
            administrationRoute: self::text($row['VIA'] ?? null),
            laboratory: self::text($row['LABORATORIO'] ?? null),
            troquel: self::text($row['TROQUEL'] ?? null),
            snomed: self::text($row['SNOMED'] ?? null),
            drug: $drug,
            drugCode: self::text($row['C_DROGA'] ?? null),
            therapeuticAction: self::text($row['ACCION'] ?? null),
            therapeuticActionCode: self::text($row['C_ACCION'] ?? null),
            dispensingCondition: self::text($row['TIPO_DE_VENTA'] ?? null),
            // «NO CONTROLADO» is the absence of a mark.
            controlMark: $controlMark === null || mb_strtoupper($controlMark) === 'NO CONTROLADO' ? null : $controlMark,
            withdrawn: self::text($row['BAJA'] ?? null) === '1',
            inForce: self::text($row['VIGENCIA'] ?? null) === '1',
            updatedOn: self::date($row['FECHA'] ?? null),
            composition: MedicationComposition::of($drug),
        );
    }

    /**
     * Plain spaces, trimmed; the source writes a blank value as a single space and some names with no-break spaces.
     */
    private static function text(mixed $value): ?string
    {
        if (! is_string($value) && ! is_int($value) && ! is_float($value)) {
            return null;
        }

        $text = trim((string) preg_replace('/[\s\x{00A0}]+/u', ' ', (string) $value));

        return $text === '' ? null : $text;
    }

    /**
     * The source writes the same kind of GTIN with 8 to 14 digits, with or without its leading zeros: the catalog
     * keeps all of them as GTIN-14.
     */
    private static function gtin(mixed $value): ?string
    {
        $digits = self::text($value);

        return $digits !== null && preg_match('/^\d{8,14}$/', $digits) === 1 ? str_pad($digits, 14, '0', STR_PAD_LEFT) : null;
    }

    /**
     * «27/10/2026» as Y-m-d.
     */
    private static function date(mixed $value): ?string
    {
        $text = self::text($value);

        if ($text === null || preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $text) !== 1) {
            return null;
        }

        try {
            return CarbonImmutable::createFromFormat('!d/m/Y', $text, 'UTC')?->format('Y-m-d');
        } catch (Throwable) {
            return null;
        }
    }
}
