<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Turns a self-contained HTML document into a PDF, keeping the library behind it (see `App\Services\Pdf`) out of the
 * callers.
 */
interface PdfRenderer
{
    /**
     * @return string the PDF's bytes
     */
    public function render(string $html): string;
}
