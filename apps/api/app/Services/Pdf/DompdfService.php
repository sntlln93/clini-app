<?php

declare(strict_types=1);

namespace App\Services\Pdf;

use App\Contracts\PdfRenderer;
use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * Pure PHP, so the production image needs no extension beyond dom and mbstring. The HTML only ever comes from our own
 * Blade views, and it still gets no remote fetches, no PHP and no JavaScript: whatever a user typed into a note can't
 * make the renderer reach the network or the filesystem.
 */
class DompdfService implements PdfRenderer
{
    public function render(string $html): string
    {
        $options = new Options;
        $options->setIsRemoteEnabled(false);
        $options->setIsPhpEnabled(false);
        $options->setIsJavascriptEnabled(false);
        $options->setDefaultFont('DejaVu Sans');
        $options->setTempDir(sys_get_temp_dir());

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4');
        $dompdf->render();

        return (string) $dompdf->output();
    }
}
