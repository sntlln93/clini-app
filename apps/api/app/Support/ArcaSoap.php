<?php

declare(strict_types=1);

namespace App\Support;

use App\Exceptions\Invoices\InvoiceIssuerUnavailableException;
use DOMDocument;
use DOMNode;
use DOMXPath;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * SOAP 1.1 over the Http client for ARCA's web services (#246): the
 * production image has no `ext-soap`, and the Http client is what tests fake.
 * Elements are read by local name, since ARCA answers with default namespaces.
 */
final class ArcaSoap
{
    private const int MESSAGE_LIMIT = 500;

    /**
     * Posts `$body` (the operation element, its own prefixes declared in
     * `$namespaces`) and returns the parsed answer, faults included: a fault
     * comes back with HTTP 500, and its code is what tells the cases apart.
     *
     * @param  array<string, string>  $namespaces  prefix => URI
     *
     * @throws InvoiceIssuerUnavailableException on a network error or an answer that isn't XML
     */
    public static function call(string $url, string $action, string $step, string $body, array $namespaces, int $timeout): DOMXPath
    {
        $declarations = '';

        foreach ($namespaces as $prefix => $uri) {
            $declarations .= ' xmlns:'.$prefix.'="'.$uri.'"';
        }

        $envelope = '<?xml version="1.0" encoding="UTF-8"?>'
            .'<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"'.$declarations.'>'
            .'<soapenv:Header/><soapenv:Body>'.$body.'</soapenv:Body></soapenv:Envelope>';

        try {
            $response = Http::withHeaders(['SOAPAction' => '"'.$action.'"'])
                ->withBody($envelope, 'text/xml; charset=utf-8')
                ->timeout($timeout)
                ->post($url);
        } catch (ConnectionException $exception) {
            throw new InvoiceIssuerUnavailableException($step, previous: $exception);
        }

        $xpath = self::parse($response->body());

        if ($xpath === null) {
            throw new InvoiceIssuerUnavailableException($step, (string) $response->status(), self::limit(trim($response->body())));
        }

        self::ensureNoFault($xpath, $step, $response);

        return $xpath;
    }

    public static function parse(string $xml): ?DOMXPath
    {
        if (trim($xml) === '') {
            return null;
        }

        $document = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        // LIBXML_NONET: an answer never makes the parser fetch anything.
        $loaded = $document->loadXML($xml, LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return $loaded ? new DOMXPath($document) : null;
    }

    /**
     * The text of the first element with that local-name path under
     * `$context` (or the document), trimmed; null when absent or empty.
     */
    public static function text(DOMXPath $xpath, string $path, ?DOMNode $context = null): ?string
    {
        $node = self::nodes($xpath, $path, $context)[0] ?? null;
        $text = $node !== null ? trim($node->textContent) : '';

        return $text !== '' ? $text : null;
    }

    /**
     * @return list<DOMNode>
     */
    public static function nodes(DOMXPath $xpath, string $path, ?DOMNode $context = null): array
    {
        return self::query($xpath, self::expression($path, $context !== null), $context);
    }

    /**
     * The element nodes an XPath expression selects.
     *
     * @return list<DOMNode>
     */
    public static function query(DOMXPath $xpath, string $expression, ?DOMNode $context = null): array
    {
        $nodes = $context !== null ? $xpath->query($expression, $context) : $xpath->query($expression);
        $found = [];

        foreach ($nodes !== false ? $nodes : [] as $node) {
            if ($node instanceof DOMNode) {
                $found[] = $node;
            }
        }

        return $found;
    }

    /**
     * Each `{Code, Msg}` under the elements at `$path` (`Errors/Err`,
     * `Observaciones/Obs`), as `<code>: <message>`.
     *
     * @return list<string>
     */
    public static function messages(DOMXPath $xpath, string $path, ?DOMNode $context = null): array
    {
        return array_map(
            fn (DOMNode $node): string => (self::text($xpath, 'Code', $node) ?? '?').': '.self::limit(self::text($xpath, 'Msg', $node) ?? ''),
            self::nodes($xpath, $path, $context),
        );
    }

    public static function limit(string $message): string
    {
        return Str::limit($message, self::MESSAGE_LIMIT);
    }

    /**
     * `a/b/c` → `//*[local-name()='a']/*[local-name()='b']/…`, relative to
     * the context node when there is one.
     */
    private static function expression(string $path, bool $relative): string
    {
        $steps = array_map(fn (string $name): string => $name === '*' ? '*' : "*[local-name()='{$name}']", explode('/', $path));

        return ($relative ? './/' : '//').implode('/', $steps);
    }

    private static function ensureNoFault(DOMXPath $xpath, string $step, Response $response): void
    {
        if (self::nodes($xpath, 'Fault') === []) {
            if ($response->failed()) {
                throw new InvoiceIssuerUnavailableException($step, (string) $response->status());
            }

            return;
        }

        $code = self::text($xpath, 'Fault/faultcode');

        throw new InvoiceIssuerUnavailableException(
            $step,
            $code !== null ? Str::afterLast($code, ':') : (string) $response->status(),
            self::limit(self::text($xpath, 'Fault/faultstring') ?? ''),
        );
    }
}
