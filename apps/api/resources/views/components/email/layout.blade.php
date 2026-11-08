@props([
    'title' => null,
    'label' => null,
    'eyebrow' => null,
    'icon' => true,
    'actionUrl' => null,
    'actionText' => null,
    'noteTitle' => null,
    'note' => null,
])
{{--
    The one layout every mail uses (#422): its own views (<x-email.layout>) and Laravel's notifications, through the
    published vendor/mail/html/message.blade.php. Every section but the body is optional: the header's label, the
    icon, the eyebrow, the title, the button (actionUrl + actionText, which also brings the «Si el botón no funciona…»
    link) and the note (the `note` slot, with an optional noteTitle). Docs: docs/architecture/emails.md.

    Mail clients can't read CSS variables or load web fonts: tables, inline styles, a 600px card, light only, system
    fonts, and the colors copied from the light theme of packages/theme (primary #0d7179, foreground #0f1a1b,
    muted-foreground #5a6b6c, accent #d9eff0, muted #f3f8f7, border over white #e7e8e8, page #eef2f2). The logo and the
    icon carry styled alt text, so the mail still reads with images blocked.
--}}
@php
    $font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    $hasNote = trim((string) $note) !== '';
    $hasAction = filled($actionUrl) && filled($actionText);
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{{ $title ?? config('brand.name') }}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #eef2f2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #eef2f2;">
<tr>
<td align="center" style="padding: 32px 16px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e7e8e8; border-top: 4px solid #0d7179; border-radius: 24px; font-family: {{ $font }};">
<tr>
<td style="padding: 32px 32px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="left" valign="middle">
<img src="{{ config('brand.mail_logo_url') }}" alt="{{ config('brand.name') }}" height="32" style="display: block; height: 32px; width: auto; border: 0; color: #0d7179; font-family: {{ $font }}; font-size: 20px; font-weight: 600;">
</td>
@if (filled($label))
<td align="right" valign="middle" style="font-family: {{ $font }}; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #5a6b6c;">{{ $label }}</td>
@endif
</tr>
</table>
</td>
</tr>
@if ($icon)
<tr>
<td align="center" style="padding: 32px 32px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="64" height="64" align="center" valign="middle" style="width: 64px; height: 64px; border-radius: 32px; background-color: #d9eff0;">
<img src="{{ config('brand.mail_icon_url') }}" alt="{{ config('brand.name') }}" width="32" height="32" style="display: block; width: 32px; height: 32px; border: 0; color: #0d7179; font-family: {{ $font }}; font-size: 11px; font-weight: 600;">
</td>
</tr>
</table>
</td>
</tr>
@endif
@if (filled($eyebrow))
<tr>
<td align="center" style="padding: 24px 32px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="padding: 6px 16px; border-radius: 999px; background-color: #d9eff0; font-family: {{ $font }}; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #0d7179;">{{ $eyebrow }}</td>
</tr>
</table>
</td>
</tr>
@endif
@if (filled($title))
<tr>
<td align="center" style="padding: 24px 32px 0;">
<h1 style="margin: 0; font-family: {{ $font }}; font-size: 28px; line-height: 1.25; font-weight: 700; color: #0f1a1b;">{{ $title }}</h1>
</td>
</tr>
@endif
<tr>
<td align="center" style="padding: 8px 32px 0; font-family: {{ $font }}; font-size: 16px; line-height: 1.6; color: #0f1a1b; text-align: center;">
{{ $slot }}
</td>
</tr>
@if ($hasAction)
<tr>
<td align="center" style="padding: 24px 32px 0;">
<x-email.button :url="$actionUrl">{{ $actionText }}</x-email.button>
</td>
</tr>
@endif
@if ($hasNote)
<tr>
<td style="padding: 32px 32px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="padding: 20px 24px; border: 1px solid #e7e8e8; border-radius: 16px; background-color: #f3f8f7; font-family: {{ $font }}; font-size: 15px; line-height: 1.6; color: #5a6b6c; text-align: left;">
@if (filled($noteTitle))
<p style="margin: 0 0 8px; font-weight: 700; color: #0f1a1b;">{{ $noteTitle }}</p>
@endif
{{ $note }}
</td>
</tr>
</table>
</td>
</tr>
@endif
@if ($hasAction)
<tr>
<td style="padding: 32px 32px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="border-top: 1px solid #e7e8e8; font-size: 0; line-height: 0;">&nbsp;</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding: 24px 32px 0; font-family: {{ $font }}; font-size: 14px; line-height: 1.6; color: #5a6b6c; text-align: left;">
Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
<a href="{{ $actionUrl }}" style="color: #0d7179; text-decoration: underline; word-break: break-all;">{{ $actionUrl }}</a>
</td>
</tr>
@endif
<tr>
<td style="padding: 32px 0 0; font-size: 0; line-height: 0;">&nbsp;</td>
</tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
<tr>
<td align="center" style="padding: 24px 16px 0; font-family: {{ $font }}; font-size: 13px; line-height: 1.5; color: #5a6b6c;">{{ config('brand.name') }} · Más tiempo para atender.</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
