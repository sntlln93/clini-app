<?php

declare(strict_types=1);

// The panel's origin, the first FRONTEND_URL entry (as the mails' links).
$panelUrl = rtrim(explode(',', (string) env('FRONTEND_URL', 'http://localhost:5174'))[0], '/');

return [

    /*
    |--------------------------------------------------------------------------
    | Brand name
    |--------------------------------------------------------------------------
    |
    | The name the mails show: the alternative text of the logo and the icon,
    | and the footer of the mail layout. Matches `name` in packages/brand's
    | manifest.
    |
    */

    'name' => env('BRAND_NAME', 'Clini'),

    /*
    |--------------------------------------------------------------------------
    | Mail logo
    |--------------------------------------------------------------------------
    |
    | Public URL of the logo atop every mail (#236). Mail clients need an
    | absolute URL to a PNG, so the default is the file the panel publishes
    | from packages/brand (its manifest's `mailLogo`). Replacing the logo is
    | replacing that file, or pointing BRAND_MAIL_LOGO_URL somewhere else.
    |
    */

    'mail_logo_url' => env('BRAND_MAIL_LOGO_URL') ?: $panelUrl.'/brand/logotype-mail.placeholder.png',

    /*
    |--------------------------------------------------------------------------
    | Mail icon
    |--------------------------------------------------------------------------
    |
    | Public URL of the isotype in the circle atop every mail (#422), the same
    | in all of them. A PNG for the same reason as the logo: the panel
    | publishes it from packages/brand (its manifest's `mailIcon`), or
    | BRAND_MAIL_ICON_URL points somewhere else.
    |
    */

    'mail_icon_url' => env('BRAND_MAIL_ICON_URL') ?: $panelUrl.'/brand/isotype-mail.placeholder.png',

];
