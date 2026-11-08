<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Invoices\ArcaAccessTicketData;
use App\Exceptions\Invoices\InvoiceIssuerUnavailableException;
use Carbon\CarbonImmutable;
use Carbon\Exceptions\InvalidFormatException;
use ErrorException;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Crypt;
use JsonException;
use LogicException;

/**
 * WSAA's access ticket for `wsfe` (#246, ADR 0039): a signed request
 * (TRA, a CMS with the certificate) traded for a token and sign valid 12
 * hours. WSAA refuses another ticket while one is still valid
 * (`coe.alreadyAuthenticated`), so the ticket is cached for its whole life and
 * only one process asks for it at a time. The cache is the database in
 * deployed environments, so it survives a deploy; the token and sign are
 * credentials, so they are stored encrypted.
 */
final class ArcaAccessTicket
{
    public const string SERVICE = 'wsfe';

    private const int TIMEOUT_SECONDS = 20;

    /** Renewed this long before it expires, so a call never carries one about to expire. */
    private const int RENEWAL_MARGIN_SECONDS = 600;

    /** The TRA's validity around now: a clock behind ARCA's must not make it future-dated. */
    private const int REQUEST_WINDOW_SECONDS = 600;

    private const int LOCK_SECONDS = 60;

    private const int LOCK_WAIT_SECONDS = 30;

    private const array URLS = [
        'homologation' => 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
        'production' => 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
    ];

    /**
     * @throws InvoiceIssuerUnavailableException
     */
    public function get(): ArcaAccessTicketData
    {
        $cached = $this->cached();

        if ($cached !== null) {
            return $cached;
        }

        $ticket = null;

        try {
            Cache::lock($this->cacheKey().':lock', self::LOCK_SECONDS)->block(
                self::LOCK_WAIT_SECONDS,
                function () use (&$ticket): void {
                    $ticket = $this->cached() ?? $this->request();
                },
            );
        } catch (LockTimeoutException $exception) {
            throw new InvoiceIssuerUnavailableException('loginCms', 'lock_timeout', previous: $exception);
        }

        if (! $ticket instanceof ArcaAccessTicketData) {
            throw new InvoiceIssuerUnavailableException('loginCms', 'lock_timeout');
        }

        return $ticket;
    }

    /**
     * Drops the cached ticket after WSFEv1 refused it (an error 600 or 601).
     */
    public function forget(): void
    {
        Cache::forget($this->cacheKey());
    }

    public static function url(): string
    {
        return self::URLS[self::environment()];
    }

    /**
     * `homologation` or `production`; anything else is a configuration error.
     */
    public static function environment(): string
    {
        $environment = Config::string('invoicing.arca.environment');

        if (! array_key_exists($environment, self::URLS)) {
            throw new LogicException('ARCA_ENVIRONMENT must be homologation or production.');
        }

        return $environment;
    }

    private function cached(): ?ArcaAccessTicketData
    {
        $stored = Cache::get($this->cacheKey());

        if (! is_string($stored)) {
            return null;
        }

        try {
            $values = json_decode(Crypt::decryptString($stored), true, flags: JSON_THROW_ON_ERROR);
        } catch (DecryptException|JsonException) {
            return null;
        }

        if (! is_array($values) || ! is_string($values['token'] ?? null) || ! is_string($values['sign'] ?? null) || ! is_string($values['expires_at'] ?? null)) {
            return null;
        }

        $ticket = new ArcaAccessTicketData($values['token'], $values['sign'], CarbonImmutable::parse($values['expires_at']));

        return $ticket->expiresAt->subSeconds(self::RENEWAL_MARGIN_SECONDS)->isFuture() ? $ticket : null;
    }

    private function request(): ArcaAccessTicketData
    {
        $xpath = ArcaSoap::call(
            self::url(),
            '',
            'loginCms',
            '<wsaa:loginCms><wsaa:in0>'.$this->signedRequest().'</wsaa:in0></wsaa:loginCms>',
            ['wsaa' => 'http://wsaa.view.sua.dvadac.desein.afip.gov'],
            self::TIMEOUT_SECONDS,
        );

        $ticket = $this->ticket(ArcaSoap::text($xpath, 'loginCmsReturn') ?? '');
        $seconds = (int) CarbonImmutable::now()->diffInSeconds($ticket->expiresAt);

        Cache::put($this->cacheKey(), Crypt::encryptString(json_encode($ticket->toArray(), JSON_THROW_ON_ERROR)), max(1, $seconds));

        return $ticket;
    }

    /**
     * `loginCmsReturn` carries the ticket as an escaped XML document.
     */
    private function ticket(string $returned): ArcaAccessTicketData
    {
        $xpath = ArcaSoap::parse($returned);
        $token = $xpath !== null ? ArcaSoap::text($xpath, 'credentials/token') : null;
        $sign = $xpath !== null ? ArcaSoap::text($xpath, 'credentials/sign') : null;
        $expiration = $xpath !== null ? ArcaSoap::text($xpath, 'header/expirationTime') : null;

        if ($token === null || $sign === null || $expiration === null) {
            throw new InvoiceIssuerUnavailableException('loginCms', 'unreadable_ticket');
        }

        try {
            $expiresAt = CarbonImmutable::parse($expiration)->utc();
        } catch (InvalidFormatException) {
            throw new InvoiceIssuerUnavailableException('loginCms', 'unreadable_ticket');
        }

        return new ArcaAccessTicketData($token, $sign, $expiresAt);
    }

    /**
     * The TRA signed as a CMS that carries it (not detached) with the
     * certificate, DER in base64: what `loginCms` takes.
     */
    private function signedRequest(): string
    {
        try {
            // Both warn, besides returning false, on something that isn't a PEM.
            $certificate = openssl_x509_read($this->pem('certificate'));
            $key = openssl_pkey_get_private($this->pem('private_key'));
        } catch (ErrorException) {
            $certificate = $key = false;
        }

        if ($certificate === false || $key === false) {
            throw new LogicException('ARCA_CERTIFICATE and ARCA_PRIVATE_KEY must be the base64 of a PEM certificate and its unencrypted private key.');
        }

        // openssl_cms_sign reads and writes files only.
        $input = self::temporaryFile($this->loginTicketRequest());
        $output = self::temporaryFile('');

        try {

            if (! openssl_cms_sign($input, $output, $certificate, $key, null, OPENSSL_CMS_BINARY, OPENSSL_ENCODING_DER)) {
                throw new LogicException('Could not sign the ARCA access request with ARCA_CERTIFICATE and ARCA_PRIVATE_KEY.');
            }

            return base64_encode((string) file_get_contents($output));
        } finally {
            foreach ([$input, $output] as $path) {
                if (is_file($path)) {
                    unlink($path);
                }
            }
        }
    }

    /**
     * A new file only this process can read, under an unguessable name
     * (created exclusively, so nothing can be planted there first).
     */
    private static function temporaryFile(string $contents): string
    {
        $path = sys_get_temp_dir().'/arca-'.bin2hex(random_bytes(16));
        $handle = fopen($path, 'x');

        if ($handle === false) {
            throw new LogicException('Could not create the temporary files to sign the ARCA access request.');
        }

        chmod($path, 0600);
        fwrite($handle, $contents);
        fclose($handle);

        return $path;
    }

    private function loginTicketRequest(): string
    {
        $now = CarbonImmutable::now();

        return '<?xml version="1.0" encoding="UTF-8"?>'
            .'<loginTicketRequest version="1.0"><header>'
            .'<uniqueId>'.$now->getTimestamp().'</uniqueId>'
            .'<generationTime>'.$now->subSeconds(self::REQUEST_WINDOW_SECONDS)->toIso8601String().'</generationTime>'
            .'<expirationTime>'.$now->addSeconds(self::REQUEST_WINDOW_SECONDS)->toIso8601String().'</expirationTime>'
            .'</header><service>'.self::SERVICE.'</service></loginTicketRequest>';
    }

    private function pem(string $key): string
    {
        $decoded = base64_decode(Config::string('invoicing.arca.'.$key), true);

        return is_string($decoded) ? $decoded : '';
    }

    /**
     * One ticket per environment and CUIT: a ticket belongs to the
     * certificate, which belongs to both.
     */
    private function cacheKey(): string
    {
        return 'arca:access-ticket:'.self::SERVICE.':'.self::environment().':'.Config::string('invoicing.issuer_data.cuit');
    }
}
