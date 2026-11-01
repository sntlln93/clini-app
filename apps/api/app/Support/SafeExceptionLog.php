<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Database\QueryException;
use Symfony\Component\Mime\Exception\RfcComplianceException;
use Throwable;

/**
 * Never a raw getMessage() or the previous exception; the trace is rebuilt without frame arguments.
 */
final class SafeExceptionLog
{
    /**
     * Bindings, Postgres' DETAIL and even the driver's first line can echo values, so only identifiers are kept.
     *
     * @return array<string, mixed>
     */
    public static function forQuery(QueryException $exception): array
    {
        $driverMessage = $exception->getPrevious()?->getMessage() ?? '';

        return [
            'exception' => $exception::class,
            'sqlstate' => $exception->errorInfo[0] ?? $exception->getCode(),
            'constraint' => self::quotedName('constraint', $driverMessage),
            'column' => self::quotedName('column', $driverMessage),
            'connection' => $exception->connectionName,
            'sql' => $exception->getSql(),
            'trace' => self::trace($exception),
        ];
    }

    /**
     * Transports echo the rejected address; Symfony's RFC error quotes only the address, so it's dropped whole and the class says what failed.
     *
     * @return array<string, mixed>
     */
    public static function forMail(Throwable $exception): array
    {
        return [
            'exception' => $exception::class,
            'reason' => $exception instanceof RfcComplianceException
                ? null
                : preg_replace(['/<[^>]*@[^>]*>/', '/\S*@\S*/'], ['<[email]>', '[email]'], $exception->getMessage()),
            'trace' => self::trace($exception),
        ];
    }

    /**
     * @return list<string>
     */
    private static function trace(Throwable $exception): array
    {
        return array_map(
            fn (array $frame): string => ($frame['file'] ?? '[internal]').':'.($frame['line'] ?? '?').' '
                .($frame['class'] ?? '').($frame['type'] ?? '').$frame['function'].'()',
            $exception->getTrace(),
        );
    }

    private static function quotedName(string $kind, string $driverMessage): ?string
    {
        return preg_match('/\b'.$kind.' "([^"]+)"/', $driverMessage, $matches) === 1 ? $matches[1] : null;
    }
}
