<?php

declare(strict_types=1);

namespace App\Services\Medications;

use App\Contracts\MedicationSource;
use App\Data\Medications\MedicationDetailData;
use App\Enums\MedicationSearchField;
use App\Exceptions\Medications\MedicationSourceUnavailableException;
use App\Support\VademecumPage;
use GuzzleHttp\Cookie\CookieJar;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

/**
 * ANMAT's public vademecum lookup (#377, ADR 0031), a ZK application with no API: each lookup opens the listing page
 * for a session, then sends the events a person's browser would (typing the term, clicking «Buscar», clicking a
 * product's detail) and reads the widget trees it answers. Only the term searched leaves Clini, never anything about a
 * patient. A failure keeps it unasked for a while, so a slow or broken lookup doesn't slow every search down.
 */
final class AnmatVademecumService implements MedicationSource
{
    private const int TIMEOUT_SECONDS = 4;

    /**
     * How long a failure keeps the lookup unasked.
     */
    private const int PAUSE_SECONDS = 300;

    private const string PAUSED = 'medications:anmat-vademecum:paused';

    private const string CLICK = '{"pageX":0,"pageY":0,"which":1,"x":0,"y":0}';

    public function available(): bool
    {
        return Config::boolean('services.anmat_vademecum.enabled') && ! Cache::has(self::PAUSED);
    }

    public function search(MedicationSearchField $field, string $term): array
    {
        return $this->pausingOnFailure(function () use ($field, $term): array {
            $session = $this->open();
            $response = $this->searchIn($session, $field, $term);

            return array_column(VademecumPage::listing($response), 'listing');
        });
    }

    public function detail(MedicationSearchField $field, string $term, string $gtin): ?MedicationDetailData
    {
        return $this->pausingOnFailure(function () use ($field, $term, $gtin): ?MedicationDetailData {
            $session = $this->open();
            $listed = VademecumPage::listing($this->searchIn($session, $field, $term));
            $row = array_values(array_filter($listed, fn (array $product): bool => $product['listing']->gtin === $gtin))[0] ?? null;

            if ($row === null) {
                return null;
            }

            $redirect = VademecumPage::redirect($this->post($session, 'click', [['onClick', $row['detail'], self::CLICK]]));

            if ($redirect === null) {
                throw new MedicationSourceUnavailableException('click');
            }

            $detail = VademecumPage::detail($this->get($session['client'], $this->origin().$redirect, 'detail')->body());

            if ($detail === null) {
                throw new MedicationSourceUnavailableException('detail');
            }

            return $detail;
        });
    }

    /**
     * @template T
     *
     * @param  callable(): T  $lookup
     * @return T
     */
    private function pausingOnFailure(callable $lookup): mixed
    {
        try {
            return $lookup();
        } catch (MedicationSourceUnavailableException $exception) {
            Cache::put(self::PAUSED, true, self::PAUSE_SECONDS);

            throw $exception;
        }
    }

    /**
     * A fresh session on the listing page: its desktop, where its events go and the components a search uses.
     *
     * @return array{client: PendingRequest, desktop: string, update: string, components: array{commercial: string, generic: string, search: string}, sequence: int}
     */
    private function open(): array
    {
        $client = Http::withOptions(['cookies' => new CookieJar])
            ->withUserAgent(Config::string('services.anmat_vademecum.user_agent'))
            ->timeout(self::TIMEOUT_SECONDS);
        $html = $this->get($client, $this->baseUrl().'/views/consultaPublica/listado.zul', 'listing')->body();
        $desktop = VademecumPage::desktopId($html);
        $update = VademecumPage::updatePath($html);
        $components = VademecumPage::searchComponents($html);

        if ($desktop === null || $update === null || $components === null) {
            throw new MedicationSourceUnavailableException('listing');
        }

        return ['client' => $client, 'desktop' => $desktop, 'update' => $update, 'components' => $components, 'sequence' => 0];
    }

    /**
     * @param  array{client: PendingRequest, desktop: string, update: string, components: array{commercial: string, generic: string, search: string}, sequence: int}  $session
     */
    private function searchIn(array &$session, MedicationSearchField $field, string $term): string
    {
        $input = $field === MedicationSearchField::Commercial ? $session['components']['commercial'] : $session['components']['generic'];
        $typed = (string) json_encode(['value' => $term, 'start' => mb_strlen($term)], JSON_UNESCAPED_UNICODE);

        return $this->post($session, 'search', [
            ['onChange', $input, $typed],
            ['onClick', $session['components']['search'], self::CLICK],
        ]);
    }

    /**
     * Sends a batch of events to the session's desktop, as ZK's own client does.
     *
     * @param  array{client: PendingRequest, desktop: string, update: string, components: array{commercial: string, generic: string, search: string}, sequence: int}  $session
     * @param  list<array{0: string, 1: string, 2: string}>  $events  command, component and its data
     */
    private function post(array &$session, string $step, array $events): string
    {
        $form = ['dtid' => $session['desktop']];

        foreach ($events as $index => [$command, $component, $data]) {
            $form["cmd_{$index}"] = $command;
            $form["uuid_{$index}"] = $component;
            $form["data_{$index}"] = $data;
        }

        $session['sequence']++;

        try {
            $response = $session['client']
                ->withHeaders(['ZK-SID' => (string) $session['sequence']])
                ->asForm()
                ->post($this->origin().$session['update'], $form);
        } catch (ConnectionException $exception) {
            throw new MedicationSourceUnavailableException($step, $exception);
        }

        if ($response->failed()) {
            throw new MedicationSourceUnavailableException($step);
        }

        return $response->body();
    }

    private function get(PendingRequest $client, string $url, string $step): Response
    {
        try {
            $response = $client->get($url);
        } catch (ConnectionException $exception) {
            throw new MedicationSourceUnavailableException($step, $exception);
        }

        if ($response->failed()) {
            throw new MedicationSourceUnavailableException($step);
        }

        return $response;
    }

    private function baseUrl(): string
    {
        return rtrim(Config::string('services.anmat_vademecum.url'), '/');
    }

    /**
     * The scheme and host: the pages answer their paths from the server's root.
     */
    private function origin(): string
    {
        $parts = parse_url($this->baseUrl());

        return ($parts['scheme'] ?? 'https').'://'.($parts['host'] ?? '').(isset($parts['port']) ? ':'.$parts['port'] : '');
    }
}
