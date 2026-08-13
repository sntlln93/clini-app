<?php

declare(strict_types=1);

namespace App\Services\Holidays;

use App\Contracts\HolidayProvider;
use App\Data\Holidays\HolidayData;
use App\Enums\Province;
use App\Exceptions\Holidays\HolidayProviderUnavailableException;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Adapter for calendariosnacionales.com's holidays API (`/ar/v1/{year}.json`
 * national, `/ar/v1/{year}/provincias/{province}.json` provincial).
 * Isolates its raw JSON shape behind `HolidayProvider`.
 */
final class CalendariosNacionalesService implements HolidayProvider
{
    private const TIMEOUT_SECONDS = 5;

    /**
     * @return array<int, HolidayData>
     */
    public function fetch(int $year, ?Province $province): array
    {
        $baseUrl = rtrim(Config::string('services.holidays.url'), '/');

        $national = $this->fetchNational($baseUrl, $year);

        if ($province === null) {
            return $national;
        }

        $provincial = $this->fetchProvincial($baseUrl, $year, $province);

        $byDate = [];

        foreach ([...$national, ...$provincial] as $holiday) {
            $byDate[$holiday->date->toDateString()] = $holiday;
        }

        return array_values($byDate);
    }

    /**
     * @return array<int, HolidayData>
     */
    private function fetchNational(string $baseUrl, int $year): array
    {
        $url = "{$baseUrl}/ar/v1/{$year}.json";

        $response = $this->request($url);

        if ($response->failed()) {
            throw new HolidayProviderUnavailableException($url);
        }

        return $this->parse($url, $response->json());
    }

    /**
     * A 404 here means "province without coverage": degrade to
     * national-only instead of failing.
     *
     * @return array<int, HolidayData>
     */
    private function fetchProvincial(string $baseUrl, int $year, Province $province): array
    {
        $url = "{$baseUrl}/ar/v1/{$year}/provincias/{$province->value}.json";

        $response = $this->request($url);

        if ($response->notFound()) {
            return [];
        }

        if ($response->failed()) {
            throw new HolidayProviderUnavailableException($url);
        }

        return $this->parse($url, $response->json());
    }

    private function request(string $url): Response
    {
        try {
            return Http::timeout(self::TIMEOUT_SECONDS)->get($url);
        } catch (ConnectionException $exception) {
            throw new HolidayProviderUnavailableException($url, $exception);
        }
    }

    /**
     * @return array<int, HolidayData>
     */
    private function parse(string $url, mixed $payload): array
    {
        if (! is_array($payload)) {
            throw new HolidayProviderUnavailableException($url);
        }

        $holidays = [];

        foreach ($payload as $item) {
            if (! is_array($item) || ! isset($item['date'], $item['name']) || ! is_string($item['date']) || ! is_string($item['name'])) {
                throw new HolidayProviderUnavailableException($url);
            }

            try {
                $date = CarbonImmutable::parse($item['date']);
            } catch (Throwable $exception) {
                throw new HolidayProviderUnavailableException($url, $exception);
            }

            $holidays[] = new HolidayData($date, $item['name']);
        }

        return $holidays;
    }
}
