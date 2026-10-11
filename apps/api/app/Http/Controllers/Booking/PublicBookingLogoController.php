<?php

declare(strict_types=1);

namespace App\Http\Controllers\Booking;

use App\Http\Controllers\Controller;
use App\Models\OrganizationLogo;
use Illuminate\Http\Response;

/**
 * Serves the stored logo whatever the plan: whether to show it is decided
 * by the booking payload and the mail (OrganizationBranding). Scoped to
 * the organization `public-organization` resolved from {slug}.
 */
class PublicBookingLogoController extends Controller
{
    public function show(): Response
    {
        $logo = OrganizationLogo::query()->firstOrFail();

        return response($logo->binary(), 200, [
            'Content-Type' => $logo->mime_type,
            'Cache-Control' => 'public, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'",
        ]);
    }
}
