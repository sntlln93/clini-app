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
 * patient. A search that fails keeps it unasked for a while, so a slow or broken lookup doesn't slow every search
 * down; a detail that fails only fails that pick.
 *
 * Each request is a fresh one sharing the session's cookies: ZK answers a repeated `ZK-SID` with its previous
 * response, and a reused request would send every earlier one with it.
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
        $session = $this->open();

        return array_column(VademecumPage::listing($this->searchIn($session, $field, $term)), 'listing');
    }

    public function detail(MedicationSearchField $field, string $term, string $gtin): ?MedicationDetailData
    {
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

        $detail = VademecumPage::detail($this->get($session['jar'], $this->origin().$redirect, 'detail')->body());

        if ($detail === null) {
            throw new MedicationSourceUnavailableException('detail');
        }

        return $detail;
    }

    /**
     * A failure opening the session or searching is the lookup's, so it pauses every search for a while.
     */
    private function pausing(MedicationSourceUnavailableException $exception): MedicationSourceUnavailableException
    {
        Cache::put(self::PAUSED, true, self::PAUSE_SECONDS);

        return $exception;
    }

    private function client(CookieJar $jar): PendingRequest
    {
        return Http::withOptions(['cookies' => $jar])
            ->withUserAgent(Config::string('services.anmat_vademecum.user_agent'))
            ->timeout(self::TIMEOUT_SECONDS);
    }

    /**
     * A fresh session on the listing page: its desktop, where its events go and the components a search uses.
     *
     * @return array{jar: CookieJar, desktop: string, update: string, components: array{commercial: string, generic: string, search: string}, sequence: int}
     */
    private function open(): array
    {
        $jar = new CookieJar;

        try {
            $html = $this->get($jar, $this->baseUrl().'/views/consultaPublica/listado.zul', 'listing')->body();
        } catch (MedicationSourceUnavailableException $exception) {
            throw $this->pausing($exception);
        }

        $desktop = VademecumPage::desktopId($html);
        $update = VademecumPage::updatePath($html);
        $components = VademecumPage::searchComponents($html);

        if ($desktop === null || $update === null || $components === null) {
            throw $this->pausing(new MedicationSourceUnavailableException('listing'));
        }

        return ['jar' => $jar, 'desktop' => $desktop, 'update' => $update, 'components' => $components, 'sequence' => 0];
    }

    /**
     * @param  array{jar: CookieJar, desktop: string, update: string, components: array{commercial: string, generic: string, search: string}, sequence: int}  $session
     */
    private function searchIn(array &$session, MedicationSearchField $field, string $term): string
    {
        $input = $field === MedicationSearchField::Commercial ? $session['components']['commercial'] : $session['components']['generic'];
        $typed = (string) json_encode(['value' => $term, 'start' => mb_strlen($term)], JSON_UNESCAPED_UNICODE);

        try {
            return $this->post($session, 'search', [
                ['onChange', $input, $typed],
                ['onClick', $session['components']['search'], self::CLICK],
            ]);
        } catch (MedicationSourceUnavailableException $exception) {
            throw $this->pausing($exception);
        }
    }

    /**
     * Sends a batch of events to the session's desktop, as ZK's own client does.
     *
     * @param  array{jar: CookieJar, desktop: string, update: string, components: array{commercial: string, generic: string, search: string}, sequence: int}  $session
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
            $response = $this->client($session['jar'])
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

    private function get(CookieJar $jar, string $url, string $step): Response
    {
        try {
            $response = $this->client($jar)->get($url);
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
