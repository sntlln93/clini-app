<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Database\QueryException;
use Symfony\Component\Mime\Exception\RfcComplianceException;
use Throwable;

/**
 * Log context for unexpected exceptions whose own message carries personal data, so
 * bootstrap/app.php can report them without it (#322). Never includes a raw getMessage() or
 * the previous exception, and the trace is rebuilt without its frames' arguments.
 */
final class SafeExceptionLog
{
    /**
     * The message inlines every binding and the previous PDOException carries Postgres' DETAIL
     * (`Key (document_number)=(…)`, `Failing row contains (…)`); even its first line can echo a
     * value (`invalid input syntax for type integer: "…"`). Only identifiers are kept.
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
     * A rejected address is echoed by most transports' errors, so any bracketed or bare token
     * holding an `@` is redacted. Symfony's RFC check quotes nothing but the address, so its
     * message is dropped whole: the class says what failed.
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
